#!/usr/bin/env bash
# Posts one plain-text message into a Google Chat thread as the Chat app.
#
# Usage: post-chat-message.sh <message-file>
# Reads CHAT_ACCESS_TOKEN, CHAT_SPACE and CHAT_THREAD from the environment so
# that no value ever has to be interpolated into a workflow expression.

set -euo pipefail

message_file="$1"

: "${CHAT_ACCESS_TOKEN:?missing}"
: "${CHAT_SPACE:?missing}"
: "${CHAT_THREAD:?missing}"

jq -n --rawfile text "$message_file" --arg thread "$CHAT_THREAD" \
	'{text: $text, thread: {name: $thread}}' >"$RUNNER_TEMP/chat-message.json"

curl --silent --show-error --fail-with-body \
	--request POST \
	"https://chat.googleapis.com/v1/${CHAT_SPACE}/messages?messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD" \
	--header "Authorization: Bearer ${CHAT_ACCESS_TOKEN}" \
	--header 'Content-Type: application/json' \
	--data @"$RUNNER_TEMP/chat-message.json"
