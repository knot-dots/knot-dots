UPDATE container SET payload = payload - 'objective' WHERE payload ? 'objective';
