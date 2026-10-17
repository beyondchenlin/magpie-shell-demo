//! Bounded function-tool wire validation only. No execution, schema resolution,
//! argument interpretation, tool registry or filesystem/network side effects.
use serde_json::Value;
use std::collections::{HashMap, HashSet};
const MAX_TOOLS: usize = 32;
fn fields(value: &Value, allowed: &[&str]) -> bool {
    value
        .as_object()
        .is_some_and(|object| object.keys().all(|key| allowed.contains(&key.as_str())))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn request() -> Value {
        json!({"messages":[{"role":"user","content":"owned"}],"tools":[{"type":"function","function":{"name":"owned_fn","parameters":{"type":"object"},"strict":true}}]})
    }
    fn call(id: &str) -> Value {
        json!({"id":id,"type":"function","function":{"name":"owned_fn","arguments":"not necessarily valid JSON"}})
    }
    fn chunk(delta: Value, reason: Value) -> Value {
        json!({"choices":[{"index":0,"delta":delta,"finish_reason":reason}]})
    }
    fn first(index: u64, id: &str) -> Value {
        json!({"index":index,"id":id,"type":"function","function":{"name":"owned_","arguments":""}})
    }
    #[test]
    fn request_contract_preserves_function_fields_and_complete_tool_history() {
        let mut input = request();
        input["tool_choice"] = json!({"type":"function","function":{"name":"owned_fn"}});
        input["parallel_tool_calls"] = json!(false);
        assert!(validate(&input).is_ok());
        assert_eq!(names(&input), HashSet::from(["owned_fn".into()]));
        input["messages"] = json!([{"role":"user","content":"owned"},{"role":"assistant","content":null,"tool_calls":[call("call1"),call("call2")]},{"role":"tool","tool_call_id":"call2","content":"second"},{"role":"tool","tool_call_id":"call1","content":"first"}]);
        assert!(
            validate(&input).is_ok(),
            "historical calls can precede string tool results in any order"
        );
        input["tool_choice"] = json!("none");
        assert!(names(&input).is_empty());
        input["messages"][3]["tool_call_id"] = json!("call2");
        assert!(
            validate(&input).is_err(),
            "duplicate tool result cannot consume a different pending ID"
        );
    }
    #[test]
    fn malformed_custom_unknown_and_unbounded_request_shapes_are_rejected() {
        for change in [
            json!({"tools":null}),
            json!({"tools":[{"type":"custom","custom":{"name":"x"}}]}),
            json!({"tools":[{"type":"function","function":{"name":"bad name"}}]}),
            json!({"tool_choice":{"type":"function","function":{"name":"unknown"}}}),
            json!({"parallel_tool_calls":1}),
            json!({"tools":[{"type":"function","function":{"name":"owned_fn","parameters":"{}"}}]}),
            json!({"messages":[{"role":"tool","tool_call_id":"orphan","content":"x"}]}),
            json!({"messages":[{"role":"assistant","tool_calls":[call("unanswered")]}]}),
        ] {
            let mut input = request();
            for (key, value) in change.as_object().unwrap() {
                input[key] = value.clone();
            }
            assert!(validate(&input).is_err(), "invalid shape {change}");
        }
        let mut input = request();
        input["tools"] = json!(vec![input["tools"][0].clone(); 33]);
        assert!(validate(&input).is_err());
        input["tools"] = json!([]);
        input["tool_choice"] = json!("required");
        assert!(validate(&input).is_err());
        input["tool_choice"] = json!("none");
        assert!(validate(&input).is_ok());
    }
    #[test]
    fn nonstream_calls_allow_null_text_and_opaque_arguments_but_bind_identity_and_parallel_limit() {
        let input = request();
        let available = names(&input);
        let value = json!({"choices":[{"index":0,"message":{"role":"assistant","content":null,"tool_calls":[call("one")]},"finish_reason":"tool_calls"}]});
        assert!(response(&value, &available, false));
        assert!(!response(&value, &HashSet::new(), true));
        let mut two = value.clone();
        two["choices"][0]["message"]["tool_calls"] = json!([call("one"), call("two")]);
        assert!(response(&two, &available, true));
        assert!(!response(&two, &available, false));
        two["choices"][0]["message"]["tool_calls"][1]["id"] = json!("one");
        assert!(!response(&two, &available, true));
        let mut invalid = value.clone();
        invalid["choices"][0]["message"]["tool_calls"][0]["function"]["arguments"] = json!({});
        assert!(!response(&invalid, &available, true));
    }
    #[test]
    fn stream_fragments_are_forwardable_without_accumulating_or_parsing_argument_json() {
        let mut stream = StreamTools::new(names(&request()), true);
        assert!(stream.accept(&chunk(
            json!({"role":"assistant","tool_calls":[first(0,"one")]}),
            Value::Null
        )));
        for fragment in ["{\"value\":", "\"你", "好\"}"] {
            assert!(stream.accept(&chunk(json!({"tool_calls":[{"index":0,"function":{"name":if fragment.starts_with('{'){"fn"}else{""},"arguments":fragment}}]}),Value::Null)));
        }
        assert_eq!(stream.calls[&0].name, "owned_fn");
        assert!(stream.calls[&0].arguments);
        assert!(stream.accept(&chunk(json!({}), json!("tool_calls"))));
        assert!(stream.accept(&json!({"choices":[],"usage":{"prompt_tokens":1}})));
        assert!(!stream.accept(&chunk(json!({"content":"late"}), Value::Null)));
    }
    #[test]
    fn incomplete_unknown_duplicate_or_changed_stream_id_never_gets_tool_call_success() {
        for update in [
            json!({"index":0,"function":{"name":"unknown"}}),
            json!({"index":0,"function":{"name":"fn"}}),
            json!({"index":1,"id":"two","type":"function","function":{"name":"owned_fn","arguments":"{}"}}),
        ] {
            let mut stream = StreamTools::new(names(&request()), true);
            assert!(stream.accept(&chunk(json!({"tool_calls":[update]}), Value::Null)));
            assert!(!stream.accept(&chunk(json!({}), json!("tool_calls"))));
        }
        let mut stream = StreamTools::new(names(&request()), true);
        assert!(stream.accept(&chunk(json!({"tool_calls":[first(0,"one")]}), Value::Null)));
        assert!(!stream.accept(&chunk(
            json!({"tool_calls":[{"index":0,"id":"changed"}]}),
            Value::Null
        )));
        let mut serial = StreamTools::new(names(&request()), false);
        assert!(!serial.accept(&chunk(json!({"tool_calls":[first(1,"two")]}), Value::Null)));
        let mut none = StreamTools::new(HashSet::new(), true);
        assert!(!none.accept(&chunk(json!({"tool_calls":[first(0,"one")]}), Value::Null)));
    }
}
fn name(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}
fn call_id(value: &str) -> bool {
    !value.is_empty() && value.len() <= 128 && !value.chars().any(char::is_control)
}
fn calls(value: &Value) -> Option<Vec<(&str, &str)>> {
    let calls = value
        .as_array()
        .filter(|calls| !calls.is_empty() && calls.len() <= MAX_TOOLS)?;
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for call in calls {
        let id = call["id"].as_str().filter(|id| call_id(id))?;
        let function = &call["function"];
        let function_name = function["name"].as_str().filter(|value| name(value))?;
        if !fields(call, &["id", "type", "function"])
            || call["type"] != "function"
            || !fields(function, &["name", "arguments"])
            || !function["arguments"].is_string()
            || !seen.insert(id)
        {
            return None;
        }
        result.push((id, function_name));
    }
    Some(result)
}
pub fn uses_tools(input: &Value) -> bool {
    ["tools", "tool_choice", "parallel_tool_calls"]
        .iter()
        .any(|key| input.get(*key).is_some())
        || input["messages"].as_array().is_some_and(|messages| {
            messages
                .iter()
                .any(|message| message["role"] == "tool" || message.get("tool_calls").is_some())
        })
}
pub fn names(input: &Value) -> HashSet<String> {
    if input["tool_choice"] == "none" {
        return HashSet::new();
    }
    if let Some(name) = input["tool_choice"]["function"]["name"].as_str() {
        return HashSet::from([name.into()]);
    }
    input["tools"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|tool| tool["function"]["name"].as_str().map(str::to_owned))
        .collect()
}
pub fn validate(input: &Value) -> Result<(), &'static str> {
    let mut available = HashSet::new();
    if let Some(tools) = input.get("tools") {
        let tools = tools
            .as_array()
            .filter(|tools| tools.len() <= MAX_TOOLS)
            .ok_or("INVALID_REQUEST")?;
        for tool in tools {
            let function = &tool["function"];
            let function_name = function["name"]
                .as_str()
                .filter(|value| name(value))
                .ok_or("INVALID_REQUEST")?;
            if tool["type"] != "function"
                || !fields(tool, &["type", "function"])
                || !fields(function, &["name", "description", "parameters", "strict"])
            {
                return Err("UNSUPPORTED_FIELD");
            }
            if !available.insert(function_name)
                || function
                    .get("description")
                    .is_some_and(|value| !value.as_str().is_some_and(|text| text.len() <= 8192))
                || function
                    .get("parameters")
                    .is_some_and(|value| !value.is_object())
                || function
                    .get("strict")
                    .is_some_and(|value| !value.is_null() && !value.is_boolean())
            {
                return Err("INVALID_REQUEST");
            }
        }
    }
    if let Some(choice) = input.get("tool_choice") {
        let valid = match choice.as_str() {
            Some("none" | "auto") => true,
            Some("required") => !available.is_empty(),
            Some(_) => false,
            None => {
                fields(choice, &["type", "function"])
                    && choice["type"] == "function"
                    && fields(&choice["function"], &["name"])
                    && choice["function"]["name"]
                        .as_str()
                        .is_some_and(|value| available.contains(value))
            }
        };
        if !valid {
            return Err("INVALID_REQUEST");
        }
    }
    if input
        .get("parallel_tool_calls")
        .is_some_and(|value| !value.is_boolean())
    {
        return Err("INVALID_REQUEST");
    }
    let messages = input["messages"].as_array().ok_or("INVALID_REQUEST")?;
    let mut pending = HashSet::new();
    for message in messages {
        let role = message["role"].as_str().ok_or("UNSUPPORTED_MESSAGE")?;
        if role == "tool" {
            if !fields(message, &["role", "content", "tool_call_id"])
                || !message["content"].is_string()
                || !message["tool_call_id"]
                    .as_str()
                    .is_some_and(|id| pending.remove(id))
            {
                return Err("INVALID_REQUEST");
            }
        } else {
            if !pending.is_empty() {
                return Err("INVALID_REQUEST");
            }
            if !fields(
                message,
                &["role", "content", "name", "tool_calls", "refusal"],
            ) {
                return Err("UNSUPPORTED_FIELD");
            }
            if message
                .get("name")
                .is_some_and(|value| !value.as_str().is_some_and(name))
            {
                return Err("INVALID_REQUEST");
            }
            if role == "assistant" {
                if message
                    .get("refusal")
                    .is_some_and(|value| !value.is_null() && !value.is_string())
                {
                    return Err("INVALID_REQUEST");
                }
                if let Some(tool_calls) = message.get("tool_calls") {
                    pending.extend(
                        calls(tool_calls)
                            .ok_or("INVALID_REQUEST")?
                            .into_iter()
                            .map(|(id, _)| id),
                    );
                    if message
                        .get("content")
                        .is_some_and(|value| !value.is_null() && !value.is_string())
                    {
                        return Err("UNSUPPORTED_MESSAGE");
                    }
                } else if !message["content"].is_string() {
                    return Err("UNSUPPORTED_MESSAGE");
                }
            } else if !matches!(role, "system" | "user" | "developer")
                || !message["content"].is_string()
                || message.get("tool_calls").is_some()
                || message.get("refusal").is_some()
            {
                return Err("UNSUPPORTED_MESSAGE");
            }
        }
    }
    if !pending.is_empty() {
        return Err("INVALID_REQUEST");
    }
    Ok(())
}
pub fn response(value: &Value, available: &HashSet<String>, parallel: bool) -> bool {
    let Some(choices) = value["choices"]
        .as_array()
        .filter(|choices| choices.len() == 1)
    else {
        return false;
    };
    let choice = &choices[0];
    let message = &choice["message"];
    if choice["index"] != 0
        || message["role"] != "assistant"
        || message.get("function_call").is_some()
    {
        return false;
    }
    let Some(returned) = calls(&message["tool_calls"]) else {
        return false;
    };
    (parallel || returned.len() == 1)
        && returned.iter().all(|(_, name)| available.contains(*name))
        && matches!(
            choice["finish_reason"].as_str(),
            Some("tool_calls" | "length" | "content_filter")
        )
        && message
            .get("content")
            .is_none_or(|value| value.is_null() || value.is_string())
}

#[derive(Default)]
struct StreamCall {
    id: Option<String>,
    name: String,
    arguments: bool,
    kind: bool,
}
pub struct StreamTools {
    available: HashSet<String>,
    calls: HashMap<u64, StreamCall>,
    ended: bool,
    max_calls: usize,
}
impl StreamTools {
    pub fn new(available: HashSet<String>, parallel: bool) -> Self {
        Self {
            available,
            calls: HashMap::new(),
            ended: false,
            max_calls: if parallel { MAX_TOOLS } else { 1 },
        }
    }
    pub fn accept(&mut self, value: &Value) -> bool {
        let Some(choices) = value["choices"].as_array() else {
            return false;
        };
        if choices.is_empty() {
            return value["usage"].is_object();
        }
        if self.ended || choices.len() != 1 || choices[0]["index"] != 0 {
            return false;
        }
        let choice = &choices[0];
        let delta = &choice["delta"];
        if !fields(delta, &["role", "content", "refusal", "tool_calls"])
            || delta
                .get("role")
                .is_some_and(|value| !value.is_null() && value != "assistant")
            || ["content", "refusal"].iter().any(|key| {
                delta
                    .get(*key)
                    .is_some_and(|value| !value.is_null() && !value.is_string())
            })
        {
            return false;
        }
        if let Some(updates) = delta.get("tool_calls") {
            if self.available.is_empty() {
                return false;
            }
            let Some(updates) = updates
                .as_array()
                .filter(|updates| !updates.is_empty() && updates.len() <= self.max_calls)
            else {
                return false;
            };
            let mut indices = HashSet::new();
            for update in updates {
                let Some(index) = update["index"]
                    .as_u64()
                    .filter(|index| *index < self.max_calls as u64 && indices.insert(*index))
                else {
                    return false;
                };
                if !fields(update, &["index", "id", "type", "function"])
                    || update.get("type").is_some_and(|value| value != "function")
                {
                    return false;
                }
                let call = self.calls.entry(index).or_default();
                if update.get("type").is_some() {
                    call.kind = true;
                }
                if let Some(id) = update.get("id") {
                    let Some(id) = id.as_str().filter(|id| call_id(id)) else {
                        return false;
                    };
                    if call.id.as_deref().is_some_and(|old| old != id) {
                        return false;
                    }
                    call.id = Some(id.into());
                }
                if let Some(function) = update.get("function") {
                    if !fields(function, &["name", "arguments"]) {
                        return false;
                    }
                    if let Some(fragment) = function.get("name") {
                        let Some(fragment) = fragment.as_str() else {
                            return false;
                        };
                        if call.name.len() + fragment.len() > 64
                            || !fragment.bytes().all(|byte| {
                                byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-')
                            })
                        {
                            return false;
                        }
                        call.name.push_str(fragment);
                    }
                    if let Some(arguments) = function.get("arguments") {
                        if !arguments.is_string() {
                            return false;
                        }
                        call.arguments = true;
                    }
                }
            }
        }
        if let Some(reason) = choice["finish_reason"].as_str() {
            if !matches!(reason, "stop" | "length" | "content_filter" | "tool_calls") {
                return false;
            }
            if reason == "tool_calls" && (self.calls.is_empty() || !self.complete()) {
                return false;
            }
            if reason == "stop" && !self.calls.is_empty() {
                return false;
            }
            self.ended = true;
        } else if !choice["finish_reason"].is_null() {
            return false;
        }
        true
    }
    fn complete(&self) -> bool {
        let mut ids = HashSet::new();
        self.calls
            .keys()
            .all(|index| *index < self.calls.len() as u64)
            && self.calls.values().all(|call| {
                call.kind
                    && call.id.as_deref().is_some_and(|id| ids.insert(id))
                    && name(&call.name)
                    && self.available.contains(&call.name)
                    && call.arguments
            })
    }
}
