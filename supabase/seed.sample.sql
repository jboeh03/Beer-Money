-- SAMPLE DATA ONLY.
-- Every row in this file is fictional. It is not a real offer, payout,
-- referral, account, or task. Do not treat it as something to claim or post.
--
-- This file is not loaded by `supabase db reset`. Apply it by hand after
-- you have signed up once, so auth.users has a row:
--
--   supabase db query -f supabase/seed.sample.sql
--
-- Rows attach to the earliest auth user. Running it again does nothing
-- if the fictional survey row is already present.

do $$
declare
  sample_user uuid;
  survey_id uuid;
  receipt_id uuid;
  link_id uuid;
  high_offer_id uuid;
begin
  select id
  into sample_user
  from auth.users
  order by created_at
  limit 1;

  if sample_user is null then
    raise notice 'SAMPLE seed skipped: sign in once so auth.users has a row.';
    return;
  end if;

  if exists (
    select 1
    from public.opportunities
    where user_id = sample_user
      and title = 'SAMPLE: Fictional survey batch'
  ) then
    raise notice 'SAMPLE seed skipped: fictional rows are already present.';
    return;
  end if;

  insert into public.opportunities (
    user_id, title, source, app, platform, category, status,
    payout_cents, est_minutes, vetter_score, priority, external_url, notes
  ) values (
    sample_user,
    'SAMPLE: Fictional survey batch',
    'sample-aggregator',
    'Sample Surveys',
    'web',
    'Sample surveys',
    'vetted',
    250,
    15,
    82,
    2,
    'https://example.com/sample-survey',
    'Fictional row for layout only. Not a real task.'
  )
  returning id into survey_id;

  insert into public.opportunities (
    user_id, title, source, app, platform, category, status,
    payout_cents, est_minutes, vetter_score, priority, external_url, notes
  ) values (
    sample_user,
    'SAMPLE: Fictional receipt scan',
    'sample-manual',
    'Sample Receipts',
    'ios',
    'Sample receipts',
    'queued',
    100,
    5,
    64,
    1,
    'https://example.com/sample-receipt',
    'Fictional row for layout only. Not a real task.'
  )
  returning id into receipt_id;

  insert into public.opportunities (
    user_id, title, source, app, platform, category, status,
    payout_cents, est_minutes, vetter_score, priority, external_url, notes
  ) values (
    sample_user,
    'SAMPLE: Fictional rejected task',
    'sample-aggregator',
    'Sample Cashback',
    'android',
    'Sample cashback',
    'rejected',
    50,
    30,
    41,
    0,
    'https://example.com/sample-rejected',
    'Fictional rejected row so a "not rejected" filter has something to hide.'
  );

  insert into public.opportunities (
    user_id, title, source, app, platform, category, status,
    payout_cents, est_minutes, vetter_score, priority, external_url, notes
  ) values (
    sample_user,
    'SAMPLE: Fictional new task',
    'sample-manual',
    'Sample Surveys',
    'web',
    'Sample surveys',
    'new',
    400,
    20,
    90,
    3,
    'https://example.com/sample-new',
    'Fictional row for layout only. Not a real task.'
  );

  insert into public.offers (
    user_id, opportunity_id, title, source, app, platform, status,
    payout_cents, est_minutes, vetter_score, terms_url, notes
  ) values (
    sample_user,
    survey_id,
    'SAMPLE: High payout fictional offer',
    'sample-aggregator',
    'Sample Surveys',
    'web',
    'vetted',
    800,
    40,
    88,
    'https://example.com/sample-terms-high',
    'Fictional offer. The matcher should treat the highest payout as the winner.'
  )
  returning id into high_offer_id;

  insert into public.offers (
    user_id, opportunity_id, title, source, app, platform, status,
    payout_cents, est_minutes, vetter_score, terms_url, notes
  ) values
    (
      sample_user,
      survey_id,
      'SAMPLE: Mid payout fictional offer',
      'sample-aggregator',
      'Sample Surveys',
      'web',
      'vetted',
      300,
      20,
      70,
      'https://example.com/sample-terms-mid',
      'Fictional offer. Not a real payout.'
    ),
    (
      sample_user,
      receipt_id,
      'SAMPLE: Low payout fictional offer',
      'sample-manual',
      'Sample Receipts',
      'ios',
      'new',
      100,
      10,
      55,
      'https://example.com/sample-terms-low',
      'Fictional offer. Not a real payout.'
    );

  insert into public.referral_links (
    user_id, opportunity_id, label, category, app, platform, url,
    referral_rate_percent, payout_per_signup_cents, signups, priority, status, notes
  ) values (
    sample_user,
    survey_id,
    'SAMPLE: Fictional referral',
    'Sample referrals',
    'Sample Surveys',
    'web',
    'https://example.com/sample-referral',
    10.000,
    500,
    3,
    1,
    'vetted',
    'Fictional link. 10.000 means 10 percent, not a real program.'
  )
  returning id into link_id;

  insert into public.payouts (
    user_id, opportunity_id, offer_id, source, app, category,
    amount_cents, status, expected_on, paid_on, notes
  ) values
    (
      sample_user,
      survey_id,
      high_offer_id,
      'sample-aggregator',
      'Sample Surveys',
      'Sample surveys',
      250,
      'claimed',
      current_date + 7,
      null,
      'Fictional claimed payout. Not money you are owed.'
    ),
    (
      sample_user,
      receipt_id,
      null,
      'sample-manual',
      'Sample Receipts',
      'Sample receipts',
      100,
      'paid',
      current_date - 7,
      current_date - 1,
      'Fictional paid payout. Not money you received.'
    ),
    (
      sample_user,
      null,
      null,
      'sample-manual',
      'Sample Surveys',
      'Sample referrals',
      500,
      'queued',
      current_date + 14,
      null,
      'Fictional queued payout. Not money you are owed.'
    );

  insert into public.posts (
    user_id, referral_link_id, channel, title, body, approval_state, disclosure, scheduled_for
  ) values
    (
      sample_user,
      link_id,
      'x',
      'SAMPLE draft',
      'Fictional draft. Do not post this.',
      'draft',
      '#ad',
      null
    ),
    (
      sample_user,
      link_id,
      'reddit',
      'SAMPLE needs review',
      'Fictional copy waiting for a person to review it.',
      'needs_review',
      'Fictional referral disclosure. #ad',
      null
    ),
    (
      sample_user,
      link_id,
      'x',
      'SAMPLE approved',
      'Fictional approved copy. Still not posted anywhere.',
      'approved',
      '#ad',
      null
    ),
    (
      sample_user,
      link_id,
      'x',
      'SAMPLE scheduled',
      'Fictional scheduled copy. This app will not publish it.',
      'scheduled',
      '#ad',
      timestamptz '2026-12-01 15:00:00+00'
    );
end $$;
