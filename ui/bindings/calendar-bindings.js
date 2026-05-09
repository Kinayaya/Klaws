(function(global){
  function registerCalendarBindings(deps={}){
    const onRef=deps.on||global.on;
    const toggleCalendarView=deps.toggleCalendarView||global.toggleCalendarView;
    onRef('calendarBackBtn','click',()=>toggleCalendarView(false));
    onRef('calendarPrevBtn','click',()=>{global.calendarCursor=new Date(global.calendarCursor.getFullYear(),global.calendarCursor.getMonth()-1,1);global.renderCalendar();});
    onRef('calendarNextBtn','click',()=>{global.calendarCursor=new Date(global.calendarCursor.getFullYear(),global.calendarCursor.getMonth()+1,1);global.renderCalendar();});
  }
  global.registerCalendarBindings=registerCalendarBindings;
})(typeof window!=='undefined'?window:globalThis);
