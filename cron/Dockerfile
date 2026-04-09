FROM curlimages/curl:latest
CMD curl -s -X POST https://studyskillsbuilder.com/api/notifications/generate \
    -H "x-cron-secret: $CRON_SECRET" \
    && echo "Notifications triggered"
