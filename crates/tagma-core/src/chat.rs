//! Text chat contract and bounded SSE framing shared by the native client and gateway.
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub const MAX_EVENT_BYTES: usize = 256 * 1024;
pub const MAX_RESPONSE_BYTES: usize = 8 * 1024 * 1024;

#[derive(Clone, Deserialize, Serialize, TS)]
#[serde(deny_unknown_fields)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Deserialize, TS)]
#[serde(deny_unknown_fields)]
pub struct StartChat {
    pub protocol_version: u32,
    pub request_id: String,
    pub expected_revision: u32,
    pub model: String,
    pub messages: Vec<ChatMessage>,
    /// Explicit one-call service operation, kept outside conversation messages.
    #[serde(default)]
    #[ts(optional)]
    pub reachflow: Option<crate::packs::ReachFlowRequest>,
}

#[derive(Clone, Serialize, TS)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ChatEvent {
    Started,
    Delta { text: String },
    Finished { reason: String },
    Cancelled,
    Failed { code: String },
}

/// Buffers only the current event, never an entire completion. Network chunks may
/// split UTF-8, CRLF delimiters or contain multiple events.
#[derive(Default)]
pub struct SseDecoder {
    buffer: Vec<u8>,
    carriage_return: bool,
    line_start: usize,
}
impl SseDecoder {
    pub fn push(&mut self, bytes: &[u8]) -> Result<Vec<String>, &'static str> {
        let mut events = Vec::new();
        for &byte in bytes {
            if self.carriage_return {
                self.carriage_return = false;
                if byte == b'\n' {
                    continue;
                }
            }
            if byte == b'\r' || byte == b'\n' {
                self.carriage_return = byte == b'\r';
                if self.line_start == self.buffer.len() {
                    let event =
                        std::str::from_utf8(&self.buffer).map_err(|_| "UPSTREAM_PROTOCOL_ERROR")?;
                    let data = event
                        .lines()
                        .filter_map(|line| {
                            line.strip_prefix("data:")
                                .map(|s| s.strip_prefix(' ').unwrap_or(s))
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                    if !data.is_empty() {
                        events.push(data);
                    }
                    self.buffer.clear();
                    self.line_start = 0;
                } else {
                    self.buffer.push(b'\n');
                    self.line_start = self.buffer.len();
                }
            } else {
                self.buffer.push(byte);
                if self.buffer.len() > MAX_EVENT_BYTES {
                    return Err("RESPONSE_LIMIT_EXCEEDED");
                }
            }
        }
        Ok(events)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn arbitrary_byte_splits_utf8_crlf_and_multiple_events() {
        let input = "data: {\"text\":\"你好\"}\r\n\r\n: ping\r\ndata: [DONE]\r\n\r\n";
        for split in 0..=input.len() {
            let mut decoder = SseDecoder::default();
            let mut events = decoder.push(&input.as_bytes()[..split]).unwrap();
            events.extend(decoder.push(&input.as_bytes()[split..]).unwrap());
            assert_eq!(events, ["{\"text\":\"你好\"}", "[DONE]"]);
        }
        let mut decoder = SseDecoder::default();
        let events: Vec<_> = input
            .as_bytes()
            .iter()
            .flat_map(|byte| decoder.push(&[*byte]).unwrap())
            .collect();
        assert_eq!(events.len(), 2);
    }
    #[test]
    fn multiline_and_bounded_event() {
        let mut decoder = SseDecoder::default();
        assert_eq!(
            decoder.push(b"data: one\ndata: two\n\n").unwrap(),
            ["one\ntwo"]
        );
        assert!(decoder.push(&vec![b'x'; MAX_EVENT_BYTES + 1]).is_err());
    }
}
