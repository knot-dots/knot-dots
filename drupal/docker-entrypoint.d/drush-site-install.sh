#!/bin/bash
set -e

if [ "$1" = "/usr/sbin/apache2ctl" ] && [ "$(drush core:status --field=install-profile)" != "knotdots" ]; then
  drush site:install -y knotdots --account-mail=stefan@knotdots.de --locale=de
fi

exec "$@"
