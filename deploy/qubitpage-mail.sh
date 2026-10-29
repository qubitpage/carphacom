#!/usr/bin/env bash
# Set up email for the qubitpage.com contact form with the OVH Zimbra mailbox, then send a test email.
# Usage:  bash qubitpage-mail.sh            (asks for the mailbox password, hidden)
#         bash qubitpage-mail.sh test       (only sends a test email with the saved settings)
set -uo pipefail
ROOT="${CARPHACOM_ROOT:-$HOME/carphacom}"
ENVF="$ROOT/nextjs-storefront/.env"
MAILBOX="${QP_MAILBOX:-contact@qubitpage.com}"
HOST="smtp.mail.ovh.net"; PORT=465

echo "== Checking the server can reach $HOST:$PORT =="
if timeout 8 bash -c "cat < /dev/null > /dev/tcp/$HOST/$PORT" 2>/dev/null; then echo "reachable"; else
  echo "port $PORT blocked, trying ssl0.ovh.net"; HOST="ssl0.ovh.net"
  timeout 8 bash -c "cat < /dev/null > /dev/tcp/$HOST/$PORT" 2>/dev/null && echo "reachable" || { echo "Outgoing SMTP is blocked on this server."; exit 1; }
fi

if [ "${1:-}" != "test" ]; then
  read -r -s -p "Password for $MAILBOX: " PASS; echo
  [ -n "$PASS" ] || { echo "No password given."; exit 1; }
  touch "$ENVF"; cp "$ENVF" "$ENVF.bak-$(date +%s)"
  grep -vE '^(SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASSWORD|SMTP_PASS|SMTP_FROM|CONTACT_NOTIFY_EMAIL|CONTACT_FROM_EMAIL)=' "$ENVF" > "$ENVF.tmp" || true
  {
    echo "SMTP_HOST=$HOST"; echo "SMTP_PORT=$PORT"; echo "SMTP_USER=$MAILBOX"
    printf 'SMTP_PASSWORD=%s\n' "$PASS"
    echo "SMTP_FROM=$MAILBOX"; echo "CONTACT_NOTIFY_EMAIL=$MAILBOX"
  } >> "$ENVF.tmp"
  mv "$ENVF.tmp" "$ENVF"; chmod 600 "$ENVF" "$ENVF".bak-* 2>/dev/null
  unset PASS
  echo "Saved to $ENVF (readable only by $(whoami))."
fi

echo "== Sending a test email to $MAILBOX =="
cd "$ROOT/nextjs-storefront" && node -e '
const fs=require("fs");const env=Object.fromEntries(fs.readFileSync(".env","utf8").split("\n").filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1).replace(/^["\x27]|["\x27]$/g,"")]));
const nm=require("nodemailer");const port=Number(env.SMTP_PORT||465);
const t=nm.createTransport({host:env.SMTP_HOST,port,secure:port===465,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD}});
t.verify().then(()=>{console.log("SMTP login OK");return t.sendMail({from:`"Qubitpage website" <${env.SMTP_FROM}>`,to:env.CONTACT_NOTIFY_EMAIL||env.SMTP_USER,subject:"qubitpage.com email test",text:"This is a test from the qubitpage.com server. Contact form emails will arrive like this."})})
 .then(i=>console.log("SENT:",i.response)).catch(e=>{console.log("FAILED:",e.code||"",e.response||e.message);process.exit(1)})'
ok=$?
if [ $ok -eq 0 ] && [ "${1:-}" != "test" ]; then pm2 restart qubit-storefront --update-env >/dev/null && echo "Storefront restarted with the new settings."; fi
exit $ok
