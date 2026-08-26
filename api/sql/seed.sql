INSERT INTO users (id, name)
VALUES (1, 'Demo User')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO habits (
  id,
  user_id,
  name,
  unit
)
VALUES
  (1, 1, 'Sleep', 'hours'),
  (2, 1, 'Exercise', 'minutes'),
  (3, 1, 'Water', 'litres')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  unit = VALUES(unit);
