UPDATE container SET payload = payload - 'indicatorContribution' WHERE payload ? 'indicatorContribution';
UPDATE container SET payload = payload - 'indicatorContributionAchieved' WHERE payload ? 'indicatorContributionAchieved';
