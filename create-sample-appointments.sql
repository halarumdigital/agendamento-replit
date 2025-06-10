-- Create sample appointments for testing
INSERT INTO appointments (
  company_id, 
  professional_id, 
  service_id, 
  client_name, 
  client_phone, 
  client_email, 
  appointment_date, 
  appointment_time, 
  status, 
  notes,
  created_at,
  updated_at
) VALUES 
(1, 5, 11, 'Carlos Silva', '5511999887766', 'carlos@email.com', '2025-06-11', '09:00', 'agendado', 'Primeiro corte do mês', NOW(), NOW()),
(1, 5, 11, 'Maria Santos', '5511888776655', 'maria@email.com', '2025-06-11', '10:30', 'agendado', 'Cliente regular', NOW(), NOW()),
(1, 5, 11, 'João Pedro', '5511777665544', 'joao@email.com', '2025-06-12', '14:00', 'confirmado', 'Corte especial', NOW(), NOW()),
(1, 5, 11, 'Ana Costa', '5511666554433', 'ana@email.com', '2025-06-13', '15:30', 'agendado', 'Nova cliente', NOW(), NOW()),
(1, 5, 11, 'Pedro Lima', '5511555443322', 'pedro@email.com', '2025-06-14', '11:00', 'agendado', 'Corte mensal', NOW(), NOW());