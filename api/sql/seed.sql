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
  target_value,
  frequency
)
VALUES
  (1, 1, 'Sleep', 'hours', 7.00, 'daily'),
  (2, 1, 'Exercise', 'minutes', 30.00, 'daily'),
  (3, 1, 'Water', 'litres', 2.00, 'daily')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  unit = VALUES(unit),
  target_value = VALUES(target_value),
  frequency = VALUES(frequency);