// https://ghe.adp.allianz/gist/sebastian-plassmann/c9750f0f2484f2bd00774f2d5777da14 
 var exchageBot = new function() {}; // TODO 
 
 // https://ghe.adp.allianz/sebastian-plassmann/chat-bot-tests/ 
 exchageBot.say = function(entry) { 
   window.postMessage(JSON.stringify({ 
     message: 'found ' + entry.type + ': ' + entry.title + ' / ' + entry.content, 
     user: 'bot' 
   }), location.protocol + '//' + location.host); 
 }; 
 
 window.addEventListener('message', function(event) { 
   var data = JSON.parse(event.data); 
   if (data.user == 'user') { 
     if (/calendar/gi.test(data.message)) exchageBot.load.calendar(); 
     if (/email/gi.test(data.message)) exchageBot.load.email(); 
   } 
 });  
 
 // get data from xml response 
 exchageBot.parse = function(xml, tag) { 
   return Array.prototype.slice.call(xml.querySelectorAll(tag)) 
     .map(function(entry) { 
       var values = {}; 
       for (var counter = 0; counter < entry.childNodes.length; counter++) { 
         var node = entry.childNodes[counter]; 
         var key = node.nodeName.split(/\:/g).pop(); 
         values[key] = node.textContent; 
       } 
      return values; 
     }) 
     .slice(0, 8); 
 }; 
  
 // create panel data from email xml 
 exchageBot.parse.email = function(xml) { 
   exchageBot.parse(xml, 'Message') 
     .sort(function(entry, compare) { 
       String(entry['DateTimeSent']).localeCompare(String(compare['DateTimeSent'])); 
     }) 
     .map(function(entry) { 
       return { 
         content: 'From: ' + entry['From'].split('(').shift() + 
           ' / Sent: ' + new Date(entry['DateTimeSent']).toLocaleString(), 
         title: entry['Subject'], 
         type: 'email message' 
       }; 
     }) 
     .forEach(exchageBot.say); 
 }; 
 
 // create panel data from calendar xml 
 exchageBot.parse.calendar = function(xml) { 
   exchageBot.parse(xml, 'CalendarItem') 
     .sort(function(entry, compare) { 
       String(entry['Start']).localeCompare(String(compare['Start'])); 
     }) 
     .map(function(entry) { 
       return { 
         content: 'Start: ' + new Date(entry['Start']).toLocaleString() + 
           ' / End: ' + new Date(entry['End']).toLocaleString(), 
         title: entry['Subject'], 
         type: 'calendar entry' 
       }; 
     }) 
     .forEach(exchageBot.say); 
 }; 
 
 // http://msdn.microsoft.com/en-us/library/office/bb409286(v=exchg.140).aspx 
 exchageBot.load = function(config) { 
   jQuery.ajax(jQuery.extend({ 
     type: 'POST', 
     url: 'https://ews.emea' + (Math.random() > 0.5 ? 1 : 2) + '.mail.service.allianz/EWS/Exchange.asmx', 
     headers: { 
       'Accept': 'application/xml,text/xml,*/*', 
       'Content-Type': 'text/xml;charset=utf-8' 
     }, 
     error: function(request) { 
       alert(request.statusText); 
     } 
   }, config)); 
 }; 
 
 exchageBot.load.email = function() { 
   exchageBot.load({ 
     data: exchageBot.load.template({ 
       type: 'inbox' 
     }), 
     success: function(xml) { 
       exchageBot.load({ 
         success: exchageBot.parse.email, 
         data: exchageBot.load.email.template({ 
           key: xml.querySelector('FolderId').getAttribute('ChangeKey'), 
           id: xml.querySelector('FolderId').getAttribute('Id') 
         }) 
       }); 
     } 
   }); 
 }; 

 exchageBot.load.calendar = function() { 
   exchageBot.load({ 
     data: exchageBot.load.template({ 
       type: 'calendar' 
     }), 
     success: function(xml) { 
       exchageBot.load({ 
         success: exchageBot.parse.calendar, 
         data: exchageBot.load.calendar.template({ 
           start: new Date().toJSON().split(/[\+\.]/g).shift(), 
           end: new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1E3).toJSON().split(/[\+\.]/g).shift(), 
           key: xml.querySelector('FolderId').getAttribute('ChangeKey'), 
           id: xml.querySelector('FolderId').getAttribute('Id') 
         }) 
       }); 
     } 
   }); 
 }; 

 // for juggling with xml/html multiline templates 
 exchageBot.template = function(input) { 
   if (typeof(input) == 'function') 
     input = String(input).split(/\/\*/).pop().split(/\*\//).shift(); 
   return function(options) { 
     return input 
       .replace(/\{\{([^\}]+)\}\}/g, function(match, found) { 
         return (found in options) ? options[found] : match; 
       }) 
       .replace(/^\s+/, '').replace(/\s+$/, ''); 
   }; 
 }; 

 exchageBot.load.calendar.template = exchageBot.template(function() { 
   /* 
 <?xml version="1.0" encoding="utf-8"?> 
   <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
     xmlns:message="http://schemas.microsoft.com/exchange/services/2006/messages" 
     xmlns:type="http://schemas.microsoft.com/exchange/services/2006/types"> 
     <soap:Header> 
       <type:RequestServerVersion Version="Exchange2007_SP1" /> 
     </soap:Header> 
     <soap:Body> 
       <message:FindItem Traversal="Shallow"> 
         <message:ItemShape> 
            <type:BaseShape>IdOnly</type:BaseShape> 
            <type:AdditionalProperties> 
              <type:FieldURI FieldURI="item:Subject" /> 
              <type:FieldURI FieldURI="calendar:Start" /> 
              <type:FieldURI FieldURI="calendar:End" /> 
            </type:AdditionalProperties> 
         </message:ItemShape> 
         <message:CalendarView StartDate="{{start}}" EndDate="{{end}}" 
           MaxEntriesReturned="32" /> 
         <message:ParentFolderIds> 
           <type:FolderId Id="{{id}}" ChangeKey="{{key}}" /> 
         </message:ParentFolderIds> 
       </message:FindItem> 
     </soap:Body> 
   </soap:Envelope> 
     */ 
 }); 

 exchageBot.load.email.template = exchageBot.template(function() { 
   /* 
 <?xml version="1.0" encoding="utf-8"?> 
   <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
     xmlns:message="http://schemas.microsoft.com/exchange/services/2006/messages" 
     xmlns:type="http://schemas.microsoft.com/exchange/services/2006/types"> 
     <soap:Header> 
       <type:RequestServerVersion Version="Exchange2007_SP1" /> 
     </soap:Header> 
     <soap:Body> 
       <message:FindItem Traversal="Shallow"> 
         <message:ItemShape> 
            <type:BaseShape>Default</type:BaseShape> 
         </message:ItemShape> 
         <message:ParentFolderIds> 
           <type:FolderId Id="{{id}}" ChangeKey="{{key}}" /> 
         </message:ParentFolderIds> 
       </message:FindItem> 
     </soap:Body> 
   </soap:Envelope> 
     */ 
 }); 

 exchageBot.load.template = exchageBot.template(function() { 
   /* 
 <?xml version="1.0" encoding="utf-8"?> 
   <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
     xmlns:message="http://schemas.microsoft.com/exchange/services/2006/messages" 
     xmlns:type="http://schemas.microsoft.com/exchange/services/2006/types"> 
     <soap:Header> 
       <type:RequestServerVersion Version="Exchange2007_SP1" /> 
     </soap:Header> 
     <soap:Body> 
       <message:GetFolder> 
         <message:FolderShape> 
         <type:BaseShape>IdOnly</type:BaseShape> 
         </message:FolderShape> 
         <message:FolderIds> 
           <type:DistinguishedFolderId Id="{{type}}" /> 
         </message:FolderIds> 
       </message:GetFolder> 
     </soap:Body> 
   </soap:Envelope> 
    */ 
 }); 
