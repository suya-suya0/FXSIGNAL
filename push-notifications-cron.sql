-- Run after deploying send-fx-notifications.
-- Uncomment only if these Vault secrets do not already exist.
-- select vault.create_secret('https://sbudokmgkfvrfgslfjyq.supabase.co','project_url');
-- select vault.create_secret('YOUR_PUBLISHABLE_KEY','publishable_key');
select cron.schedule('send-fx-notifications-every-minute','* * * * *',$$
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1) || '/functions/v1/send-fx-notifications',
  headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name='publishable_key' limit 1)),
  body := jsonb_build_object('source','cron'),
  timeout_milliseconds := 5000
) as request_id;
$$);
