(function(global){
  function registerCalendarBindings(deps={}){
    const onRef=deps.on||global.on;
    const toggleCalendarView=deps.toggleCalendarView||global.toggleCalendarView;
    onRef('calendarBackBtn','click',()=>toggleCalendarView(false));
    onRef('calendarPrevBtn','click',()=>{
      const cursor=global.calendarCursor||calendarCursor||new Date();
      const next=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);
      if(typeof global.calendarCursor!=='undefined') global.calendarCursor=next;
      calendarCursor=next;
      global.renderCalendar();
    });
    onRef('calendarNextBtn','click',()=>{
      const cursor=global.calendarCursor||calendarCursor||new Date();
      const next=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
      if(typeof global.calendarCursor!=='undefined') global.calendarCursor=next;
      calendarCursor=next;
      global.renderCalendar();
    });
  }
  global.registerCalendarBindings=registerCalendarBindings;
})(typeof window!=='undefined'?window:globalThis);
