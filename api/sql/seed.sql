INSERT INTO users (id, name, timezone)
VALUES (1, 'Demo User', 'Asia/Singapore')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  timezone = VALUES(timezone);

INSERT INTO habits (
  id,
  user_id,
  name,
  unit,
  frequency
)
VALUES
  (1, 1, 'Sleep', 'hours', 'daily'),
  (2, 1, 'Exercise', 'minutes', 'daily'),
  (3, 1, 'Water', 'litres', 'daily')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  unit = VALUES(unit),
  frequency = VALUES(frequency);
