create or replace function public.increment_event_click(event_id uuid)
returns void as $$
begin
  update public.events
  set click_count = click_count + 1
  where id = event_id;
end;
$$ language plpgsql;
