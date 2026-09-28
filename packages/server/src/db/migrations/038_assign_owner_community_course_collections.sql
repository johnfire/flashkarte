-- Organize the public community courses authored by the primary curator. Keep
-- any existing manual membership unchanged, and do not touch official content
-- or courses authored by other community members.
INSERT INTO course_collections (title, description, is_official)
VALUES (
  'Industrial Power and Machine Control',
  'Conceptual structured courses about industrial power and machine control.',
  false
)
ON CONFLICT (title) DO NOTHING;

WITH classified_courses AS (
  SELECT
    subject.id,
    subject.reference_number,
    subject.title,
    CASE
      WHEN subject.title ILIKE '%The Art of Electronics%'
        OR subject.title ILIKE '%Die Kunst der Elektronik%'
        THEN 'Art of Electronics'
      WHEN subject.title ~* '(^|[^[:alpha:]])AI([^[:alpha:]]|$)'
        OR subject.title LIKE 'KI-%'
        OR subject.title ILIKE '%Transformers in LLMs%'
        THEN 'Artificial Intelligence'
      WHEN subject.title ILIKE '%Industrial Power and Machine Control%'
        OR subject.title ILIKE '%Industrieleistung und Maschinensteuerung%'
        THEN 'Industrial Power and Machine Control'
      ELSE NULL
    END AS collection_title
  FROM subjects AS subject
  JOIN users AS owner ON owner.id = subject.user_id
  WHERE owner.email = 'car2187bus@pm.me'
    AND subject.is_public
    AND NOT subject.is_official
    AND subject.course_collection_id IS NULL
), ranked_courses AS (
  SELECT
    id,
    collection_title,
    row_number() OVER (
      PARTITION BY collection_title
      ORDER BY reference_number, title COLLATE de_phonebook
    )::int - 1 AS collection_position
  FROM classified_courses
  WHERE collection_title IS NOT NULL
), assigned_courses AS (
  UPDATE subjects AS subject
  SET
    course_collection_id = collection.id,
    course_collection_position = ranked.collection_position,
    updated_at = now()
  FROM ranked_courses AS ranked
  JOIN course_collections AS collection
    ON collection.title = ranked.collection_title
  WHERE subject.id = ranked.id
  RETURNING
    subject.id,
    subject.course_collection_id,
    subject.course_collection_position
)
INSERT INTO audit_log (
  actor_type,
  actor_id,
  action,
  target_type,
  target_id,
  correlation_id,
  outcome,
  after_state
)
SELECT
  'ai-agent',
  'codex:course-collection-organization',
  'course.collection_assigned',
  'subject',
  assigned.id,
  'migration:038_assign_owner_community_course_collections',
  'success',
  jsonb_build_object(
    'collectionId', assigned.course_collection_id,
    'position', assigned.course_collection_position
  )
FROM assigned_courses AS assigned;
