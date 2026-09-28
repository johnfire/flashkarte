-- The initial official navigation groups for structured Learn courses. Course
-- membership is intentionally curated separately: inferring it from titles
-- would put learners in the wrong course family or language path.
INSERT INTO course_collections (title, description, is_official)
VALUES
  (
    'Art of Electronics',
    'Structured courses in electronics, circuits, and practical engineering.',
    true
  ),
  (
    'Artificial Intelligence',
    'Structured courses on artificial intelligence and its practical applications.',
    true
  ),
  (
    'German for English Speakers',
    'German-language courses designed for learners who speak English.',
    true
  ),
  (
    'German for Arabic Speakers',
    'German-language courses designed for learners who speak Arabic.',
    true
  ),
  (
    'Miscellaneous',
    'Structured courses that do not belong to another official collection.',
    true
  )
ON CONFLICT (title) DO NOTHING;
