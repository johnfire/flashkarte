-- Subject model: a per-subject prerequisite graph (see
-- docs/plans/2026-09-19-subject-model-design.md). Additive only: four new
-- tables, no existing table is touched. Mastery, the study frontier and units
-- are computed on read (from card_progress), not stored here.
--
-- kind / tier / strength CHECK lists mirror CONCEPT_KINDS, CONCEPT_TIERS and
-- EDGE_STRENGTHS in packages/shared/src/graph/concept-graph-types.ts -- keep
-- them in step.
CREATE TABLE IF NOT EXISTS subjects (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  is_public   boolean NOT NULL DEFAULT false,
  -- Bumped on every change to the graph, so a learner's view can be tied to
  -- the revision of the graph it was computed from.
  version     int NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);

CREATE TABLE IF NOT EXISTS concepts (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  -- Stable, human-readable id ("kv-cache"). Progress and edges refer to the
  -- concept, so reshuffling decks never loses anyone's progress.
  slug       text NOT NULL,
  name       text NOT NULL,
  kind       text NOT NULL
    CHECK (kind IN ('term', 'idea', 'skill', 'map', 'capstone', 'assumption')),
  tier       text NOT NULL DEFAULT 'core' CHECK (tier IN ('core', 'extension')),
  -- Authoring order: the tie-break that makes route order deterministic.
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT concepts_slug_unique UNIQUE (subject_id, slug)
);

-- from_concept is the prerequisite, to_concept the dependent. The schema does
-- not require both ends to share a subject (cross-subject prerequisites are a
-- planned extension); the API currently enforces that they do.
CREATE TABLE IF NOT EXISTS concept_edges (
  from_concept uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  to_concept   uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  strength     text NOT NULL CHECK (strength IN ('requires', 'suggests')),
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_concept, to_concept),
  CONSTRAINT concept_edges_no_self_edge CHECK (from_concept <> to_concept),
  -- A gating claim must say why; the graph is a hypothesis reviewers audit.
  CONSTRAINT concept_edges_requires_reason
    CHECK (strength <> 'requires' OR length(btrim(coalesce(reason, ''))) > 0)
);
CREATE INDEX IF NOT EXISTS idx_concept_edges_to ON concept_edges(to_concept);

-- Which cards assess (or teach) which concept. Cross-deck by design.
CREATE TABLE IF NOT EXISTS card_concepts (
  card_id    uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, concept_id)
);
CREATE INDEX IF NOT EXISTS idx_card_concepts_concept ON card_concepts(concept_id);
