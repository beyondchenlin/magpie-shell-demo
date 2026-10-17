//! Team recipes contain references and text-only plans, never credentials or scripts.
use crate::{service::ConfigSnapshot, *};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct CloudTarget {
    pub provider_id: String,
    pub model_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BrainTargetKind {
    Brain,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BrainTarget {
    pub kind: BrainTargetKind,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(untagged)]
pub enum CloudSelection {
    Explicit(CloudTarget),
    Brain(BrainTarget),
}
impl From<CloudTarget> for CloudSelection {
    fn from(target: CloudTarget) -> Self {
        Self::Explicit(target)
    }
}
impl CloudSelection {
    pub fn brain() -> Self {
        Self::Brain(BrainTarget {
            kind: BrainTargetKind::Brain,
        })
    }
    pub fn explicit(&self) -> Option<&CloudTarget> {
        if let Self::Explicit(target) = self {
            Some(target)
        } else {
            None
        }
    }
    pub fn resolve(&self, brain: Option<&CloudTarget>) -> Option<CloudTarget> {
        match self {
            Self::Explicit(target) => Some(target.clone()),
            Self::Brain(_) => brain.cloned(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
// ts-rs does not understand enum deny_unknown_fields; keep the TS tag explicit.
#[ts(tag = "kind", rename_all = "snake_case")]
pub enum TeamBrain {
    Explicit { target: CloudTarget },
    FirstCloud {},
    LocalBrainPack { pack_id: String, version: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
#[ts(tag = "kind", rename_all = "snake_case")]
pub enum TeamStepTarget {
    CloudModel { target: CloudSelection },
    Pack { pack_id: String, version: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TeamRouting {
    Manual,
    Sequential,
    Intent,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TeamStepInput {
    OriginalMessages,
    PreviousText,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TeamStepOutput {
    IntermediateText,
    FinalAnswer,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TeamFailurePolicy {
    Abort,
}
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TeamSideEffect {
    OutboundModelRequest,
    PackOperation,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TeamStep {
    pub target: TeamStepTarget,
    pub input: TeamStepInput,
    pub output: TeamStepOutput,
    pub timeout_ms: u32,
    pub failure: TeamFailurePolicy,
    pub side_effect: TeamSideEffect,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TeamRecipe {
    pub display_name: String,
    /// The final answering model. Sequential intermediate models are explicit step targets.
    pub brain: TeamBrain,
    pub routing: TeamRouting,
    pub steps: Vec<TeamStep>,
    pub total_timeout_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TeamPermission {
    OutboundModelRequest,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
pub struct PublishedTeam {
    pub team_id: String,
    pub public_id: String,
    pub revision: u32,
    pub recipe: TeamRecipe,
    pub permissions: Vec<TeamPermission>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
pub struct TeamRecord {
    pub id: String,
    pub slug: String,
    pub draft: TeamRecipe,
    pub versions: Vec<PublishedTeam>,
    /// Availability is separate from immutable recipe revisions.
    pub enabled_revisions: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TeamPublishIssue {
    MissingSteps,
    UnsupportedRouting,
    UnsupportedBrain,
    MissingBrain,
    NoAvailableBrain,
    RevokedDependency,
    MissingDependency,
    PackNotAvailable,
    InvalidStepFlow,
    InvalidSideEffect,
    BudgetExceeded,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TeamView {
    pub team: TeamRecord,
    pub publish_issues: Vec<TeamPublishIssue>,
    pub published: Vec<PublishedTeamView>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct PublishedTeamView {
    pub revision: u32,
    pub public_id: String,
    pub display_name: String,
    pub enabled: bool,
    pub configured_ready: bool,
    pub issues: Vec<TeamPublishIssue>,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct SaveTeam {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub id: Option<String>,
    pub slug: String,
    pub recipe: TeamRecipe,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct SetTeamEnabled {
    pub protocol_version: u32,
    pub expected_revision: u32,
    pub id: String,
    pub team_revision: u32,
    pub enabled: bool,
}

fn invalid() -> AppError {
    AppError::new(ErrorCode::InvalidInput)
}
fn bounded_text(value: &str, max: usize) -> bool {
    !value.trim().is_empty() && value.chars().count() <= max && !value.chars().any(char::is_control)
}
pub fn valid_team_slug(slug: &str) -> bool {
    (2..=64).contains(&slug.len())
        && slug
            .bytes()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
        && slug
            .as_bytes()
            .first()
            .is_some_and(u8::is_ascii_alphanumeric)
        && slug
            .as_bytes()
            .last()
            .is_some_and(u8::is_ascii_alphanumeric)
        && !matches!(slug, "reachflow" | "local-brain")
}
fn valid_cloud(target: &CloudTarget) -> bool {
    Uuid::parse_str(&target.provider_id).is_ok()
        && bounded_text(&target.model_id, 256)
        && !target.model_id.starts_with("tagma/")
}
fn valid_pack(id: &str, version: &str) -> bool {
    bounded_text(id, 120) && bounded_text(version, 80)
}
impl TeamRecipe {
    /// Incomplete dependencies/flows may be saved; malformed or unbounded inputs may not.
    pub fn validate_draft(&self) -> AppResult<()> {
        let brain_valid = match &self.brain {
            TeamBrain::Explicit { target } => valid_cloud(target),
            TeamBrain::FirstCloud {} => true,
            TeamBrain::LocalBrainPack { pack_id, version } => valid_pack(pack_id, version),
        };
        if !bounded_text(&self.display_name, 120)
            || self.steps.len() > 8
            || !(1000..=120_000).contains(&self.total_timeout_ms)
            || !brain_valid
        {
            return Err(invalid());
        }
        for step in &self.steps {
            let target_valid = match &step.target {
                TeamStepTarget::CloudModel { target } => target.explicit().is_none_or(valid_cloud),
                TeamStepTarget::Pack { pack_id, version } => valid_pack(pack_id, version),
            };
            if !target_valid || !(1000..=120_000).contains(&step.timeout_ms) {
                return Err(invalid());
            }
        }
        Ok(())
    }
    pub fn references_provider(&self, id: &str) -> bool {
        matches!(&self.brain,TeamBrain::Explicit{target} if target.provider_id==id)
            || self.steps.iter().any(|step|matches!(&step.target,TeamStepTarget::CloudModel{target} if target.explicit().is_some_and(|target|target.provider_id==id)))
    }
    pub fn resolve_brain(&self, first_cloud: Option<&CloudTarget>) -> Option<CloudTarget> {
        match &self.brain {
            TeamBrain::Explicit { target } => Some(target.clone()),
            TeamBrain::FirstCloud {} => first_cloud.cloned(),
            TeamBrain::LocalBrainPack { .. } => None,
        }
    }
    pub fn publish_issues(&self, snapshot: &ConfigSnapshot) -> Vec<TeamPublishIssue> {
        self.publish_issues_with_health(snapshot, &[], 0)
    }
    pub fn publish_issues_with_health(
        &self,
        snapshot: &ConfigSnapshot,
        health: &[crate::health::ModelHealthRecord],
        now: u64,
    ) -> Vec<TeamPublishIssue> {
        let candidate = crate::health::select_first_cloud(snapshot, health, now);
        self.publish_issues_with_candidate(snapshot, candidate.as_ref())
    }
    pub fn publish_issues_with_candidate(
        &self,
        snapshot: &ConfigSnapshot,
        first_cloud: Option<&CloudTarget>,
    ) -> Vec<TeamPublishIssue> {
        use TeamPublishIssue::*;
        let available = |target: &CloudTarget| {
            snapshot.providers.iter().any(|p| {
                p.provider.id == target.provider_id
                    && p.provider.enabled
                    && p.provider.models.contains(&target.model_id)
            })
        };
        let mut issues = Vec::new();
        let brain = self.resolve_brain(first_cloud);
        if self.steps.is_empty() {
            issues.push(MissingSteps);
        }
        if self.routing == TeamRouting::Intent
            || (self.routing == TeamRouting::Manual && self.steps.len() != 1)
        {
            issues.push(UnsupportedRouting);
        }
        match &self.brain {
            TeamBrain::Explicit { target } => {
                if !available(target) {
                    issues.push(MissingBrain);
                }
            }
            TeamBrain::FirstCloud {} => {
                if brain.is_none() {
                    issues.push(NoAvailableBrain);
                }
                if !self.steps.last().is_some_and(|s| {
                    matches!(
                        &s.target,
                        TeamStepTarget::CloudModel {
                            target: CloudSelection::Brain(_)
                        }
                    )
                }) {
                    issues.push(InvalidStepFlow);
                }
            }
            TeamBrain::LocalBrainPack { .. } => issues.push(UnsupportedBrain),
        }
        if let Some(brain) = &brain
            && !self.steps.last().is_some_and(|s|matches!(&s.target,TeamStepTarget::CloudModel{target} if target.resolve(Some(brain)).as_ref()==Some(brain)))
        {
            issues.push(InvalidStepFlow);
        }
        if self
            .steps
            .iter()
            .map(|s| u64::from(s.timeout_ms))
            .sum::<u64>()
            > u64::from(self.total_timeout_ms)
        {
            issues.push(BudgetExceeded);
        }
        for (index, step) in self.steps.iter().enumerate() {
            match &step.target {
                TeamStepTarget::CloudModel { target } => {
                    if !target
                        .resolve(brain.as_ref())
                        .is_some_and(|target| available(&target))
                    {
                        issues.push(MissingDependency);
                    }
                    if step.side_effect != TeamSideEffect::OutboundModelRequest {
                        issues.push(InvalidSideEffect);
                    }
                }
                TeamStepTarget::Pack { .. } => issues.push(PackNotAvailable),
            }
            if (index == 0 && step.input == TeamStepInput::PreviousText)
                || (index + 1 == self.steps.len()) != (step.output == TeamStepOutput::FinalAnswer)
            {
                issues.push(InvalidStepFlow);
            }
        }
        let mut unique = Vec::new();
        for issue in issues {
            if !unique.contains(&issue) {
                unique.push(issue);
            }
        }
        unique
    }
}

impl ConfigService {
    pub fn save_team(&self, input: SaveTeam) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        input.recipe.validate_draft()?;
        if !valid_team_slug(&input.slug) {
            return Err(invalid());
        }
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let editing = input.id.is_some();
        let id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        Uuid::parse_str(&id).map_err(|_| invalid())?;
        if snapshot
            .teams
            .iter()
            .any(|team| team.id != id && team.slug == input.slug)
        {
            return Err(AppError::new(ErrorCode::TeamSlugConflict));
        }
        let position = snapshot.teams.iter().position(|team| team.id == id);
        if editing && position.is_none() || !editing && snapshot.teams.len() >= 32 {
            return Err(invalid());
        }
        if let Some(index) = position {
            if !snapshot.teams[index].versions.is_empty()
                && snapshot.teams[index].slug != input.slug
            {
                return Err(AppError::new(ErrorCode::TeamPublished));
            }
            snapshot.teams[index].slug = input.slug;
            snapshot.teams[index].draft = input.recipe;
        } else {
            snapshot.teams.push(TeamRecord {
                id,
                slug: input.slug,
                draft: input.recipe,
                versions: Vec::new(),
                enabled_revisions: Vec::new(),
            });
        }
        self.commit(revision, &snapshot, None)?;
        self.view()
    }
    pub fn publish_team(&self, input: RevisionCommand) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let index = snapshot
            .teams
            .iter()
            .position(|t| t.id == input.id)
            .ok_or_else(invalid)?;
        let team = &snapshot.teams[index];
        if !valid_team_slug(&team.slug) {
            return Err(AppError::new(ErrorCode::TeamSlugConflict));
        }
        team.draft.validate_draft()?;
        let health = self.read_health_records(&snapshot)?;
        if self
            .snapshot_security(&snapshot)?
            .revoked_provider_ids
            .iter()
            .any(|id| team.draft.references_provider(id))
        {
            return Err(AppError::new(ErrorCode::AccessRevoked));
        }
        let issues =
            team.draft
                .publish_issues_with_health(&snapshot, &health, crate::health::now_ms()?);
        if issues.contains(&TeamPublishIssue::NoAvailableBrain) {
            return Err(AppError::new(ErrorCode::NoAvailableBrain));
        }
        if !issues.is_empty() {
            return Err(AppError::new(ErrorCode::TeamRecipeUnavailable));
        }
        if team.versions.len() >= 16 {
            return Err(invalid());
        }
        let team = &mut snapshot.teams[index];
        let next = team.versions.len() as u32 + 1;
        let public_id = if next == 1 {
            format!("tagma/{}", team.slug)
        } else {
            format!("tagma/{}@{next}", team.slug)
        };
        team.versions.push(PublishedTeam {
            team_id: team.id.clone(),
            public_id,
            revision: next,
            recipe: team.draft.clone(),
            permissions: vec![TeamPermission::OutboundModelRequest],
        });
        team.enabled_revisions.push(next);
        self.commit(revision, &snapshot, None)?;
        self.view()
    }
    pub fn set_team_enabled(&self, input: SetTeamEnabled) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let team = snapshot
            .teams
            .iter_mut()
            .find(|t| t.id == input.id)
            .ok_or_else(invalid)?;
        if !team
            .versions
            .iter()
            .any(|v| v.revision == input.team_revision)
        {
            return Err(invalid());
        }
        team.enabled_revisions.retain(|r| *r != input.team_revision);
        if input.enabled {
            team.enabled_revisions.push(input.team_revision);
            team.enabled_revisions.sort_unstable();
        }
        self.commit(revision, &snapshot, None)?;
        self.view()
    }
    pub fn delete_team(&self, input: RevisionCommand) -> AppResult<ConfigView> {
        check_protocol(input.protocol_version)?;
        let _operation = self.operation_lock()?;
        let (revision, mut snapshot) = self.read_snapshot()?;
        if revision != input.expected_revision {
            return Err(AppError::new(ErrorCode::ConfigConflict));
        }
        let index = snapshot
            .teams
            .iter()
            .position(|t| t.id == input.id)
            .ok_or_else(invalid)?;
        if !snapshot.teams[index].versions.is_empty() {
            return Err(AppError::new(ErrorCode::TeamPublished));
        }
        snapshot.teams.remove(index);
        self.commit(revision, &snapshot, None)?;
        self.view()
    }
}
