(function(global){
  const isValidDateObject=(value)=>value instanceof Date&&!Number.isNaN(value.getTime());
  function resolveCalendarCursor(){
    if(typeof global.getCalendarCursor==='function') return global.getCalendarCursor();
    if(isValidDateObject(global.calendarCursor)) return global.calendarCursor;
    return global.setCalendarCursor?global.setCalendarCursor(new Date()):new Date();
  }

  function syncCalendarCursor(next){
    if(typeof global.setCalendarCursor==='function'){
      global.setCalendarCursor(next);
      return;
    }
    global.calendarCursor=isValidDateObject(next)?next:new Date();
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
