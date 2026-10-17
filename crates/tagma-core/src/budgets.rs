//! User-defined soft observation targets. Never authorize or reject dispatch,
//! charge money, estimate a bill, or claim a provider's actual balance.
use crate::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use ts_rs::TS;
pub const MAX_RULES: usize = 32;
fn invalid() -> AppError {
    AppError::new(ErrorCode::InvalidInput)
}
fn uuid(id: &str) -> bool {
    uuid::Uuid::parse_str(id).is_ok_and(|parsed| parsed.to_string() == id)
}
pub fn limit(value: &str) -> AppResult<u64> {
    let number = value.parse::<u64>().map_err(|_| invalid())?;
    if number == 0 || number > i64::MAX as u64 || number.to_string() != value {
        return Err(invalid());
    }
    Ok(number)
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum BudgetScope {
    AllAttempts,
    Provider {
        provider_id: String,
    },
    Model {
        provider_id: String,
        model_id: String,
    },
    Team {
        public_id: String,
    },
}
impl BudgetScope {
    fn validate(&self) -> AppResult<()> {
        let valid = match self {
            Self::AllAttempts => true,
            Self::Provider { provider_id } => uuid(provider_id),
            Self::Model {
                provider_id,
                model_id,
            } => {
                uuid(provider_id)
                    && !model_id.trim().is_empty()
                    && model_id.len() <= 256
                    && !model_id.chars().any(char::is_control)
                    && !model_id.starts_with("tagma/")
            }
            Self::Team { public_id } => public_id.strip_prefix("tagma/").is_some_and(|id| match id
                .split_once('@')
            {
                Some((slug, version)) => {
                    teams::valid_team_slug(slug)
                        && version
                            .parse::<u32>()
                            .is_ok_and(|n| n >= 2 && n.to_string() == version)
                }
                None => teams::valid_team_slug(id),
            }),
        };
        if valid { Ok(()) } else { Err(invalid()) }
    }
    /// Provider/model rules use actual attempts; a public team ID uses logical
    /// requests and all of their recorded step usage. They are never added.
    pub fn metric_kind(&self) -> usage::read::UsageMetricKind {
        if matches!(self, Self::Team { .. }) {
            usage::read::UsageMetricKind::Request
        } else {
            usage::read::UsageMetricKind::Attempt
        }
    }
    pub fn filter(&self) -> usage::read::UsageFilter {
        let mut filter = usage::read::UsageFilter::default();
        match self {
            Self::AllAttempts => {}
            Self::Provider { provider_id } => filter.provider_id = Some(provider_id.clone()),
            Self::Model {
                provider_id,
                model_id,
            } => {
                filter.provider_id = Some(provider_id.clone());
                filter.model = Some(model_id.clone());
            }
            Self::Team { public_id } => filter.model = Some(public_id.clone()),
        }
        filter
    }
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum BudgetPeriod {
    UtcDay,
    UtcMonth,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct BudgetSpec {
    pub name: String,
    pub scope: BudgetScope,
    pub period: BudgetPeriod,
    pub request_limit: Option<String>,
    pub token_limit: Option<String>,
}
impl BudgetSpec {
    pub fn validate(&self) -> AppResult<()> {
        if self.name.trim().is_empty()
            || self.name.len() > 120
            || self.name.chars().any(char::is_control)
            || (self.request_limit.is_none() && self.token_limit.is_none())
        {
            return Err(invalid());
        }
        self.scope.validate()?;
        for limit_value in [&self.request_limit, &self.token_limit]
            .into_iter()
            .flatten()
        {
            limit(limit_value)?;
        }
        Ok(())
    }
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct BudgetRule {
    pub id: String,
    pub spec: BudgetSpec,
}
#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct SaveBudget {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub id: Option<String>,
    pub spec: BudgetSpec,
}
pub(crate) fn validate_rules(rules: &[BudgetRule]) -> AppResult<()> {
    if rules.len() > MAX_RULES
        || rules
            .iter()
            .map(|rule| &rule.id)
            .collect::<HashSet<_>>()
            .len()
            != rules.len()
    {
        return Err(invalid());
    }
    for rule in rules {
        if !uuid(&rule.id) {
            return Err(invalid());
        }
        rule.spec.validate()?;
    }
    Ok(())
}
impl ConfigService {
    pub fn save_budget(&self, input: SaveBudget) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        input.spec.validate()?;
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let editing = input.id.is_some();
        let id = input.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        if !uuid(&id) {
            return Err(invalid());
        }
        let position = snapshot.budgets.iter().position(|rule| rule.id == id);
        if (editing && position.is_none()) || (!editing && snapshot.budgets.len() >= MAX_RULES) {
            return Err(invalid());
        }
        let rule = BudgetRule {
            id,
            spec: BudgetSpec {
                name: input.spec.name.trim().into(),
                ..input.spec
            },
        };
        if let Some(position) = position {
            snapshot.budgets[position] = rule;
        } else {
            snapshot.budgets.push(rule);
        }
        self.commit(revision, &snapshot, None)?;
        self.view()
    }
    pub fn delete_budget(&self, input: RevisionCommand) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        if !uuid(&input.id) {
            return Err(invalid());
        }
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let before = snapshot.budgets.len();
        snapshot.budgets.retain(|rule| rule.id != input.id);
        if snapshot.budgets.len() == before {
            return Err(invalid());
        }
        self.commit(revision, &snapshot, None)?;
        self.view()
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    };
    #[derive(Default)]
    struct NoSecrets(AtomicUsize);
    impl credentials::CredentialStore for NoSecrets {
        fn set(&self, _: &str, _: &str) -> AppResult<()> {
            self.0.fetch_add(1, Ordering::SeqCst);
            Err(AppError::new(ErrorCode::CredentialStoreUnavailable))
        }
        fn get(&self, _: &str) -> AppResult<zeroize::Zeroizing<String>> {
            self.0.fetch_add(1, Ordering::SeqCst);
            Err(AppError::new(ErrorCode::CredentialStoreUnavailable))
        }
        fn delete(&self, _: &str) -> AppResult<()> {
            self.0.fetch_add(1, Ordering::SeqCst);
            Err(AppError::new(ErrorCode::CredentialStoreUnavailable))
        }
    }
    fn spec() -> BudgetSpec {
        BudgetSpec {
            name: " soft target ".into(),
            scope: BudgetScope::AllAttempts,
            period: BudgetPeriod::UtcMonth,
            request_limit: Some("10".into()),
            token_limit: None,
        }
    }
    fn input(revision: u32) -> SaveBudget {
        SaveBudget {
            protocol_version: 1,
            expected_revision: revision,
            id: None,
            spec: spec(),
        }
    }
    #[test]
    fn soft_rules_crud_share_revisions_and_never_touch_secrets_or_usage() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-soft-budget-")
            .tempdir()
            .unwrap();
        let secrets = Arc::new(NoSecrets::default());
        let config = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        assert!(config.view().unwrap().budgets.is_empty());
        let view = config.save_budget(input(0)).unwrap();
        assert_eq!(view.desired_revision, 1);
        assert_eq!(view.budgets[0].spec.name, "soft target");
        let id = view.budgets[0].id.clone();
        assert_eq!(
            config.save_budget(input(0)).unwrap_err().code,
            ErrorCode::ConfigConflict
        );
        let provider = uuid::Uuid::new_v4().to_string();
        let mut edit = input(1);
        edit.id = Some(id.clone());
        edit.spec.scope = BudgetScope::Model {
            provider_id: provider.clone(),
            model_id: "historical-cloud".into(),
        };
        edit.spec.request_limit = Some(i64::MAX.to_string());
        edit.spec.token_limit = Some("7".into());
        let view = config.save_budget(edit).unwrap();
        assert_eq!(view.desired_revision, 2);
        assert_eq!(
            view.budgets[0].spec.scope.filter().provider_id.as_deref(),
            Some(provider.as_str())
        );
        drop(config);
        let config = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        assert_eq!(config.view().unwrap().budgets, view.budgets);
        let mut wrong = input(2);
        wrong.id = Some(uuid::Uuid::new_v4().to_string());
        assert_eq!(
            config.save_budget(wrong).unwrap_err().code,
            ErrorCode::InvalidInput
        );
        let view = config
            .delete_budget(RevisionCommand {
                protocol_version: 1,
                expected_revision: 2,
                id,
            })
            .unwrap();
        assert_eq!(view.desired_revision, 3);
        assert!(view.budgets.is_empty());
        assert!(!temp.path().join("usage.sqlite3").exists());
        assert_eq!(secrets.0.load(Ordering::SeqCst), 0);
        println!(
            "Soft budgets:shared config CRUD/reopen/conflict and historical targets;exact i64MAX limits;no key access0,no usage DB created,no dispatch limiter"
        );
    }
    #[test]
    fn bounds_scopes_and_decimal_limits_are_strict() {
        for value in [
            "0",
            "01",
            "+1",
            "-1",
            "1.5",
            "1e3",
            "9223372036854775808",
            "",
        ] {
            assert!(limit(value).is_err());
        }
        for value in ["1", "9007199254740993", "9223372036854775807"] {
            assert_eq!(limit(value).unwrap().to_string(), value);
        }
        let mut missing = spec();
        missing.request_limit = None;
        assert!(missing.validate().is_err());
        let mut long = spec();
        long.name = "中".repeat(41);
        assert!(long.validate().is_err());
        for id in ["tagma/aa", "tagma/aa@2", "tagma/aa@4294967295"] {
            let scope = BudgetScope::Team {
                public_id: id.into(),
            };
            assert!(scope.validate().is_ok());
            assert_eq!(scope.metric_kind(), usage::read::UsageMetricKind::Request);
            assert_eq!(scope.filter().model.as_deref(), Some(id));
        }
        for id in [
            "aa",
            "tagma/a",
            "tagma/reachflow",
            "tagma/aa@1",
            "tagma/aa@02",
            "tagma/aa@0",
            "tagma/aa@4294967296",
            "tagma/aa@2/other",
        ] {
            assert!(
                BudgetScope::Team {
                    public_id: id.into()
                }
                .validate()
                .is_err()
            );
        }
        let uuid = uuid::Uuid::new_v4().to_string();
        assert!(
            BudgetScope::Model {
                provider_id: uuid.clone(),
                model_id: "tagma/aa".into()
            }
            .validate()
            .is_err()
        );
        assert!(
            BudgetScope::Provider {
                provider_id: uuid.to_uppercase()
            }
            .validate()
            .is_err()
        );
        assert_eq!(
            BudgetScope::AllAttempts.metric_kind(),
            usage::read::UsageMetricKind::Attempt
        );
        let temp = tempfile::Builder::new()
            .prefix("tagma-soft-budget-")
            .tempdir()
            .unwrap();
        let config = ConfigService::open(temp.path(), Arc::new(NoSecrets::default())).unwrap();
        for revision in 0..32 {
            config.save_budget(input(revision)).unwrap();
        }
        assert_eq!(
            config.save_budget(input(32)).unwrap_err().code,
            ErrorCode::InvalidInput
        );
        assert_eq!(config.view().unwrap().desired_revision, 32);
        let mut duplicate = config.view().unwrap().budgets;
        duplicate[1].id = duplicate[0].id.clone();
        assert!(validate_rules(&duplicate).is_err());
        println!(
            "Soft budget bounds:32rules;strict UUID/team immutable public IDs and UTF8/decimal limits;provider/model use attempts,team logical requests,no doublecount"
        );
    }
    #[test]
    fn commit_failure_preserves_prior_budget_and_revision() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-soft-budget-")
            .tempdir()
            .unwrap();
        let secrets = Arc::new(NoSecrets::default());
        let config = ConfigService::open(temp.path(), secrets.clone()).unwrap();
        let db = rusqlite::Connection::open(temp.path().join("config.sqlite3")).unwrap();
        db.execute_batch("CREATE TRIGGER owned_budget_failure BEFORE INSERT ON revisions BEGIN SELECT RAISE(ABORT,'owned budget commit failure');END;").unwrap();
        assert_eq!(
            config.save_budget(input(0)).unwrap_err().code,
            ErrorCode::StorageUnavailable
        );
        let view = config.view().unwrap();
        assert_eq!(view.desired_revision, 0);
        assert!(view.budgets.is_empty());
        db.execute_batch("DROP TRIGGER owned_budget_failure;")
            .unwrap();
        config.save_budget(input(0)).unwrap();
        assert_eq!(secrets.0.load(Ordering::SeqCst), 0);
        println!(
            "Soft budget failed commit:prior revision0/empty rules preserved,explicit retry creates exactly1 rule,credentials untouched"
        );
    }
}
