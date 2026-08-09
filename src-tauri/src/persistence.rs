use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

const CURRENT_SCHEMA_VERSION: u32 = 1;
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Debug, thiserror::Error)]
pub enum PersistenceError {
    #[error("无法创建本地数据目录：{0}")]
    Directory(#[from] std::io::Error),
    #[error("SQLite 操作失败：{0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("本地数据无法解析：{0}")]
    Json(#[from] serde_json::Error),
    #[error("本地数据无效：{0}")]
    Invalid(String),
    #[error("本地数据版本 {0} 高于当前应用支持的版本")]
    UnsupportedSchema(u32),
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MarkerColor {
    Green,
    Blue,
    Red,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineNode {
    id: String,
    order: u64,
    text: String,
    created_at: u64,
    color: MarkerColor,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchivedNode {
    id: String,
    order: u64,
    text: String,
    created_at: u64,
    color: MarkerColor,
    archived_at: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineDocument {
    schema_version: u32,
    active_nodes: Vec<TimelineNode>,
    archived_nodes: Vec<ArchivedNode>,
}

impl TimelineDocument {
    fn empty() -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            active_nodes: Vec::new(),
            archived_nodes: Vec::new(),
        }
    }

    fn validate(&self) -> Result<(), PersistenceError> {
        if self.schema_version != CURRENT_SCHEMA_VERSION {
            return Err(PersistenceError::UnsupportedSchema(self.schema_version));
        }

        let mut ids = HashSet::new();
        for (index, node) in self.active_nodes.iter().enumerate() {
            validate_common(&mut ids, &node.id, node.order, &node.text, node.created_at)?;
            if node.order != index as u64 {
                return Err(PersistenceError::Invalid("节点顺序不连续".into()));
            }
        }

        for node in &self.archived_nodes {
            validate_common(&mut ids, &node.id, node.order, &node.text, node.created_at)?;
            if node.archived_at > MAX_SAFE_INTEGER {
                return Err(PersistenceError::Invalid("归档时间超出安全范围".into()));
            }
            if node.archived_at < node.created_at {
                return Err(PersistenceError::Invalid("归档时间早于创建时间".into()));
            }
        }
        Ok(())
    }
}

fn validate_common(
    ids: &mut HashSet<String>,
    id: &str,
    order: u64,
    text: &str,
    created_at: u64,
) -> Result<(), PersistenceError> {
    if id.is_empty() || !ids.insert(id.to_owned()) {
        return Err(PersistenceError::Invalid("节点标识无效或重复".into()));
    }
    if text.trim().is_empty() {
        return Err(PersistenceError::Invalid("节点内容不能为空".into()));
    }
    if order > MAX_SAFE_INTEGER {
        return Err(PersistenceError::Invalid("节点顺序超出安全范围".into()));
    }
    if created_at > MAX_SAFE_INTEGER {
        return Err(PersistenceError::Invalid("创建时间超出安全范围".into()));
    }
    Ok(())
}

pub struct TimelineStore {
    path: PathBuf,
}

impl TimelineStore {
    pub fn open(path: PathBuf) -> Result<Self, PersistenceError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let store = Self { path };
        store.migrate()?;
        Ok(store)
    }

    pub fn load(&self) -> Result<TimelineDocument, PersistenceError> {
        let connection = self.connect()?;
        let payload: Option<String> = connection
            .query_row(
                "SELECT payload FROM timeline_document WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .optional()?;
        let Some(payload) = payload else {
            return Ok(TimelineDocument::empty());
        };
        let document: TimelineDocument = serde_json::from_str(&payload)?;
        document.validate()?;
        Ok(document)
    }

    pub fn save(&self, document: &TimelineDocument) -> Result<(), PersistenceError> {
        document.validate()?;
        let payload = serde_json::to_string(document)?;
        let updated_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|error| PersistenceError::Invalid(error.to_string()))?
            .as_millis() as u64;
        if updated_at > MAX_SAFE_INTEGER {
            return Err(PersistenceError::Invalid("更新时间超出安全范围".into()));
        }

        let mut connection = self.connect()?;
        let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
        transaction.execute(
            "INSERT INTO timeline_document (id, schema_version, payload, updated_at)
             VALUES (1, ?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET
               schema_version = excluded.schema_version,
               payload = excluded.payload,
               updated_at = excluded.updated_at",
            params![document.schema_version, payload, updated_at as i64],
        )?;
        transaction.commit()?;
        Ok(())
    }

    fn connect(&self) -> Result<Connection, PersistenceError> {
        let connection = Connection::open(&self.path)?;
        connection.pragma_update(None, "foreign_keys", true)?;
        connection.busy_timeout(std::time::Duration::from_secs(3))?;
        Ok(connection)
    }

    fn migrate(&self) -> Result<(), PersistenceError> {
        let mut connection = self.connect()?;
        let version: u32 = connection.pragma_query_value(None, "user_version", |row| row.get(0))?;
        if version > CURRENT_SCHEMA_VERSION {
            return Err(PersistenceError::UnsupportedSchema(version));
        }
        if version == 0 {
            let transaction =
                connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
            transaction.execute_batch(
                "CREATE TABLE IF NOT EXISTS timeline_document (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    schema_version INTEGER NOT NULL,
                    payload TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                 );",
            )?;
            transaction.pragma_update(None, "user_version", CURRENT_SCHEMA_VERSION)?;
            transaction.commit()?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn sample(text: &str) -> TimelineDocument {
        TimelineDocument {
            schema_version: 1,
            active_nodes: vec![TimelineNode {
                id: "node-a".into(),
                order: 0,
                text: text.into(),
                created_at: 100,
                color: MarkerColor::Green,
            }],
            archived_nodes: Vec::new(),
        }
    }

    #[test]
    fn migrates_and_restores_from_real_sqlite_file() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("timeline.sqlite3");
        let store = TimelineStore::open(path.clone()).unwrap();
        assert_eq!(store.load().unwrap(), TimelineDocument::empty());
        store.save(&sample("持久化节点")).unwrap();
        drop(store);

        let reopened = TimelineStore::open(path.clone()).unwrap();
        assert_eq!(reopened.load().unwrap(), sample("持久化节点"));
        let connection = Connection::open(path).unwrap();
        let version: u32 = connection
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .unwrap();
        assert_eq!(version, CURRENT_SCHEMA_VERSION);
    }

    #[test]
    fn failed_sqlite_write_preserves_last_committed_document() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("timeline.sqlite3");
        let store = TimelineStore::open(path.clone()).unwrap();
        let original = sample("原始内容");
        store.save(&original).unwrap();

        let connection = Connection::open(&path).unwrap();
        connection
            .execute_batch(
                "CREATE TRIGGER reject_timeline_update
             BEFORE UPDATE ON timeline_document
             BEGIN SELECT RAISE(ABORT, 'forced write failure'); END;",
            )
            .unwrap();
        assert!(store.save(&sample("不应写入")).is_err());
        connection
            .execute_batch("DROP TRIGGER reject_timeline_update;")
            .unwrap();
        assert_eq!(store.load().unwrap(), original);
    }

    #[test]
    fn reports_corrupt_payload_instead_of_replacing_it() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("timeline.sqlite3");
        let store = TimelineStore::open(path.clone()).unwrap();
        store.save(&sample("有效内容")).unwrap();
        let connection = Connection::open(path).unwrap();
        connection
            .execute(
                "UPDATE timeline_document SET payload = ?1 WHERE id = 1",
                ["not-json"],
            )
            .unwrap();
        assert!(matches!(store.load(), Err(PersistenceError::Json(_))));
    }

    #[test]
    fn rejects_invalid_document_before_touching_disk() {
        let directory = tempdir().unwrap();
        let store = TimelineStore::open(directory.path().join("timeline.sqlite3")).unwrap();
        let original = sample("有效内容");
        store.save(&original).unwrap();
        let invalid = TimelineDocument {
            schema_version: 1,
            active_nodes: vec![TimelineNode {
                id: "node-b".into(),
                order: 0,
                text: "   ".into(),
                created_at: 100,
                color: MarkerColor::Blue,
            }],
            archived_nodes: Vec::new(),
        };
        assert!(matches!(
            store.save(&invalid),
            Err(PersistenceError::Invalid(_))
        ));
        assert_eq!(store.load().unwrap(), original);
    }
}
