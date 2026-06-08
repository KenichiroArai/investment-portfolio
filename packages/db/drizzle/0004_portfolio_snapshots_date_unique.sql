DELETE FROM `portfolio_snapshots`
WHERE `rowid` NOT IN (
  SELECT MAX(`rowid`)
  FROM `portfolio_snapshots`
  GROUP BY `portfolio_id`, `as_of_date`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portfolio_snapshots_portfolio_date_unique` ON `portfolio_snapshots` (`portfolio_id`,`as_of_date`);
