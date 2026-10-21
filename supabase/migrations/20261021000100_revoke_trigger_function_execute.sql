-- トリガー専用の SECURITY DEFINER 関数を API（/rest/v1/rpc）から呼べないようにする
-- トリガーの発火には EXECUTE 権限は不要なため、動作には影響しない
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.pools_record_revision() from public, anon, authenticated;
