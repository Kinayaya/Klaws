(function(global){
  function resolveCalendarCursor(){
    if(global.calendarCursor instanceof Date&&!Number.isNaN(global.calendarCursor.getTime())) return global.calendarCursor;
    if(typeof calendarCursor!=='undefined'&&calendarCursor instanceof Date&&!Number.isNaN(calendarCursor.getTime())) return calendarCursor;
    return new Date();
  }

  function syncCalendarCursor(next){
    global.calendarCursor=next;
    if(typeof calendarCursor!=='undefined') calendarCursor=next;
  }

  function registerCalendarBindings(deps={}){
    const onRef=deps.on||global.on;
    const toggleCalendarView=deps.toggleCalendarView||global.toggleCalendarView;
    onRef('calendarBackBtn','click',()=>toggleCalendarView(false));
    onRef('calendarPrevBtn','click',()=>{
      const cursor=resolveCalendarCursor();
      const next=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);
      syncCalendarCursor(next);
      global.renderCalendar();
    });
    onRef('calendarNextBtn','click',()=>{
      const cursor=resolveCalendarCursor();
      const next=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
      syncCalendarCursor(next);
      global.renderCalendar();
    });
  }
  global.registerCalendarBindings=registerCalendarBindings;
})(typeof window!=='undefined'?window:globalThis);
