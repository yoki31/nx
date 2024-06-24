use std::sync::Arc;

use anyhow::*;
use dashmap::DashMap;
use tracing::{trace, warn};

use crate::native::types::FileData;
use crate::native::{glob::build_glob_set, hasher::hash};

pub fn hash_workspace_files(
    workspace_file_set: &str,
    all_workspace_files: &[FileData],
    cache: Arc<DashMap<String, String>>,
) -> Result<String> {
    let file_set = workspace_file_set.strip_prefix("{workspaceRoot}/");

    let Some(file_set) = file_set else {
        warn!(
            "{workspace_file_set} does not start with {}. This will throw an error in Nx 20.",
            "{workspaceRoot}/"
        );
        return Ok(hash(b""));
    };

    if let Some(cache_results) = cache.get(file_set) {
        return Ok(cache_results.clone());
    }

    let glob = build_glob_set(&[file_set])?;

    let mut hasher = xxhash_rust::xxh3::Xxh3::new();
    for file in all_workspace_files
        .iter()
        .filter(|file| glob.is_match(&file.file))
    {
        trace!("{:?} was found with glob {:?}", file.file, file_set);
        hasher.update(file.hash.as_bytes());
    }
    let hashed_value = hasher.digest().to_string();

    cache.insert(file_set.to_string(), hashed_value.clone());
    Ok(hashed_value)
}

#[cfg(test)]
mod test {
    use crate::native::hasher::hash;

    use super::*;
    use dashmap::DashMap;
    use std::sync::Arc;

    #[test]
    fn invalid_workspace_input_is_just_empty_hash() {
        let result =
            hash_workspace_files("packages/{package}", &[], Arc::new(DashMap::new())).unwrap();
        assert_eq!(result, hash(b""));
    }

    #[test]
    fn test_hash_workspace_files() {
        let gitignore_file = FileData {
            file: ".gitignore".into(),
            hash: "123".into(),
        };
        let nxignore_file = FileData {
            file: ".nxignore".into(),
            hash: "456".into(),
        };
        let package_json_file = FileData {
            file: "package.json".into(),
            hash: "789".into(),
        };
        let project_file = FileData {
            file: "packages/project/project.json".into(),
            hash: "abc".into(),
        };
        let result = hash_workspace_files(
            "{workspaceRoot}/.gitignore",
            &[
                gitignore_file.clone(),
                nxignore_file.clone(),
                package_json_file.clone(),
                project_file.clone(),
            ],
            Arc::new(DashMap::new()),
        )
        .unwrap();
        assert_eq!(result, hash(gitignore_file.hash.as_bytes()));
    }
}
