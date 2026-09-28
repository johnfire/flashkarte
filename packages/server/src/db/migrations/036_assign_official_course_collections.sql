-- Curated official-course memberships. These titles were verified against the
-- live catalogue; keeping them explicit avoids inferring a learner path from a
-- partial title or explanation language alone.
WITH course_memberships (course_title, collection_title, position) AS (
  VALUES
    ('AI Literacy: From Pattern Learning to Language Models', 'Artificial Intelligence', 1),
    ('KI-Grundlagen: Vom Musterlernen zu Sprachmodellen', 'Artificial Intelligence', 2),
    ('Transformers in LLMs', 'Artificial Intelligence', 3),
    ('The Art of Electronics - Transistors (Chapters 2 and 3)', 'Art of Electronics', 1)
)
UPDATE subjects AS subject
SET
  course_collection_id = collection.id,
  course_collection_position = membership.position
FROM course_memberships AS membership
JOIN course_collections AS collection
  ON collection.title = membership.collection_title
  AND collection.is_official
WHERE subject.title = membership.course_title
  AND subject.is_official;
