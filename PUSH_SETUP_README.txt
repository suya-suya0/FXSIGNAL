FX SIGNAL バックグラウンドPush通知 セットアップ

1. Supabase > SQL Editor
   push-notifications-setup.sql を全部実行

2. VAPIDキー
   VAPID_KEYS_PRIVATE.txt を開く
   - VAPID_PUBLIC_KEY
   - VAPID_PRIVATE_KEY
   を確認
   ※このファイルとPRIVATE KEYは絶対にGitHubへアップロードしない

3. Supabase > Edge Functions > Secrets
   次の3つを追加
   VAPID_PUBLIC_KEY = VAPID_KEYS_PRIVATE.txt の公開鍵
   VAPID_PRIVATE_KEY = VAPID_KEYS_PRIVATE.txt の秘密鍵
   VAPID_SUBJECT = mailto:あなたのメールアドレス

4. GitHubへ最新版を置き換え
   - index.html
   - service-worker.js
   ※index.htmlには公開鍵だけ設定済み

5. Supabase > Edge Functions
   新しく send-fx-notifications を作成
   index.ts に send-fx-notifications-index.ts の中身を貼る
   Deploy

6. send-fx-notifications を Test
   {"ok":true,...} が返ればOK

7. push-notifications-cron.sql をSQL Editorで実行
   1分ごとに通知時刻を確認する

8. スマホのFX SIGNALを最新版に更新
   通知画面 →「通知を許可する」
   「バックグラウンド通知：登録済み」になれば完了

9. 通知設定（★1/★2/★3、金利、要人発言、60/30/5/直前）は
   スマホごとにSupabaseへ同期される

重要:
アプリを閉じている時のWeb Push通知音はスマホOSの通知設定に従います。
任意の notification.mp3 をバックグラウンドPushの音として強制指定することはできません。
