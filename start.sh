#!/bin/sh

# Start the cron service
service cron start

tail -f /var/log/cron.log