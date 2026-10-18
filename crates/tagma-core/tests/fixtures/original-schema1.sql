CREATE TABLE revisions(revision INTEGER PRIMARY KEY, snapshot TEXT NOT NULL);
CREATE TABLE config_head(singleton INTEGER PRIMARY KEY CHECK(singleton=1), revision INTEGER NOT NULL REFERENCES revisions(revision));
CREATE TABLE credential_journal(operation_id TEXT PRIMARY KEY, credential_ref TEXT NOT NULL UNIQUE);
INSERT INTO revisions VALUES(0, '{"providers":[]}');
INSERT INTO config_head VALUES(1,0);
PRAGMA user_version=1;
