-- Additive library schema. No game tables are renamed, replaced or deleted.
CREATE TABLE IF NOT EXISTS huroof_library_football_entities (
 id VARCHAR(191) COLLATE utf8mb4_bin PRIMARY KEY,
 entity_type VARCHAR(32) NOT NULL, name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
 image_key TEXT NULL,image_source TEXT NULL,image_license TEXT NULL,fallback TEXT NOT NULL,
 metadata LONGTEXT NOT NULL CHECK(JSON_VALID(metadata)),updated_at BIGINT NOT NULL,
 INDEX(entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS huroof_library_visual_assets (
 id VARCHAR(191) COLLATE utf8mb4_bin PRIMARY KEY,content_type VARCHAR(64) NOT NULL,
 relative_path VARCHAR(512) COLLATE utf8mb4_bin NOT NULL UNIQUE,
 sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,license TEXT NOT NULL,source TEXT NOT NULL,created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS huroof_library_football_relations (
 id VARCHAR(191) COLLATE utf8mb4_bin PRIMARY KEY,
 from_entity_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,to_entity_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
 relation_type VARCHAR(64) NOT NULL,starts_at CHAR(10) NULL,ends_at CHAR(10) NULL,
 metadata LONGTEXT NOT NULL CHECK(JSON_VALID(metadata)),source TEXT NOT NULL,
 FOREIGN KEY(from_entity_id) REFERENCES huroof_library_football_entities(id),
 FOREIGN KEY(to_entity_id) REFERENCES huroof_library_football_entities(id),
 INDEX(from_entity_id,relation_type),INDEX(to_entity_id,relation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS huroof_library_football_import_batches (
 id VARCHAR(191) COLLATE utf8mb4_bin PRIMARY KEY,source TEXT NOT NULL,snapshot_date CHAR(10) NOT NULL,
 sha256 CHAR(64) NOT NULL,entities_added BIGINT NOT NULL,relations_added BIGINT NOT NULL,
 images_missing BIGINT NOT NULL,created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS huroof_library_football_participant_snapshots (
 competition_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,season VARCHAR(32) COLLATE utf8mb4_bin NOT NULL,
 team_ids LONGTEXT NOT NULL CHECK(JSON_VALID(team_ids)),source TEXT NOT NULL,verified_at CHAR(10) NOT NULL,
 status VARCHAR(16) NOT NULL CHECK(status IN ('pending','reviewed')),PRIMARY KEY(competition_id,season),
 FOREIGN KEY(competition_id) REFERENCES huroof_library_football_entities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS huroof_library_football_squad_snapshots (
 team_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,competition_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
 season VARCHAR(32) COLLATE utf8mb4_bin NOT NULL,player_ids LONGTEXT NOT NULL CHECK(JSON_VALID(player_ids)),
 coach_ids LONGTEXT NOT NULL CHECK(JSON_VALID(coach_ids)),source TEXT NOT NULL,verified_at CHAR(10) NOT NULL,
 status VARCHAR(16) NOT NULL CHECK(status IN ('pending','reviewed')),PRIMARY KEY(team_id,competition_id,season),
 FOREIGN KEY(team_id) REFERENCES huroof_library_football_entities(id),
 FOREIGN KEY(competition_id) REFERENCES huroof_library_football_entities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS huroof_library_football_context_media (
 id VARCHAR(191) COLLATE utf8mb4_bin PRIMARY KEY,entity_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
 team_id VARCHAR(191) COLLATE utf8mb4_bin NULL,role VARCHAR(16) NOT NULL CHECK(role IN ('portrait','flag','emblem','logo')),
 starts_at CHAR(10) NOT NULL,ends_at CHAR(10) NULL,asset_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
 review LONGTEXT NOT NULL CHECK(JSON_VALID(review)),UNIQUE(entity_id,team_id,role,starts_at),
 FOREIGN KEY(entity_id) REFERENCES huroof_library_football_entities(id),
 FOREIGN KEY(team_id) REFERENCES huroof_library_football_entities(id),
 FOREIGN KEY(asset_id) REFERENCES huroof_library_visual_assets(id),INDEX(entity_id,team_id,role,starts_at,ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS huroof_library_football_fact_records (
 id VARCHAR(191) COLLATE utf8mb4_bin PRIMARY KEY,entity_id VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
 kind VARCHAR(32) NOT NULL,context_id VARCHAR(191) COLLATE utf8mb4_bin NULL,season VARCHAR(32) NULL,
 as_of CHAR(10) NOT NULL,payload LONGTEXT NOT NULL CHECK(JSON_VALID(payload)),source TEXT NOT NULL,
 status VARCHAR(16) NOT NULL CHECK(status IN ('pending','reviewed','unavailable','conflicting')),verified_at CHAR(10) NOT NULL,
 FOREIGN KEY(entity_id) REFERENCES huroof_library_football_entities(id),INDEX(entity_id,kind,season,as_of)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS huroof_library_import_runs (
 snapshot_sha CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,counts LONGTEXT NOT NULL CHECK(JSON_VALID(counts)),
 imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
