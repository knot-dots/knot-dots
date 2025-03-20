#!/bin/bash
set -e

isCommand() {
  # Retain backwards compatibility with common CI providers,
  # see: https://github.com/composer/docker/issues/107
  if [ "$1" = "sh" ]; then
    return 1
  fi

  composer help --no-interaction "$1" > /dev/null 2>&1
}

if [ "${1#-}" != "$1" ]; then
  set -- composer "$@"
elif [ "$1" = 'composer' ]; then
  set -- "$@"
elif isCommand "$1"; then
  set -- composer "$@"
fi

exec "$@"
