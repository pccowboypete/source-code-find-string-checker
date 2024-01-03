

function init_settings(){
    chrome.storage.sync.get('initialized', function(data) {
        if(!data.initialized){
            chrome.storage.sync.set({ caseSensitive: true });
            chrome.storage.sync.set({ initialized: true });
        }
    });
}
init_settings();




document.addEventListener('contextmenu', event => event.preventDefault());

$( document ).ready(function() {
    init_ui();    
});

//begin : click events
$( "#check-button" ).on( "click", function() {
    getPageSource(getPageSourceCallbackFn);
} );


$( "#addFindModal .button-yes" ).on( "click", function() {
    var addFindModal_textarea_value = $("#addFindModal textarea").val();

    if(addFindModal_textarea_value.length > 0){
        var newstringEntryKey = StringEntriesStorage.add( addFindModal_textarea_value);

        var newStringEntryHTML = getStringEntryHTML(newstringEntryKey, addFindModal_textarea_value);
        $(".item-list-wrapper table tbody").append(newStringEntryHTML);

        $('#addFindModal').modal('toggle');
    }else{
        alert("Please enter a value.");
    }

    
} );

$( "#editModal .button-yes" ).on( "click", function() {

    var editModal_textarea_value = $("#editModal textarea").val();
    var currentEntryKey = $("#editModal").attr("current-edit-entry-key");

    if(currentEntryKey != null){

        if(editModal_textarea_value.length > 0){
            if(StringEntriesStorage.update(currentEntryKey, editModal_textarea_value)){
                $('#editModal').modal('toggle');

                $("#entryTRKey"+ currentEntryKey + " .td-string code").text(editModal_textarea_value);
                $("#entryTRKey"+ currentEntryKey + " .td-result").html(getBlankResultsCountHTML());
            }else{
                alert("Error updating. Please try again.");
            }            
        }else{
            alert("Please enter a value.");
        }
    }else{
        alert("Error : 001");
    }

} );

$( "#deleteModal .button-yes" ).on( "click", function() {
    var currentEntryKey = $("#deleteModal").attr("current-delete-entry-key");

    if(currentEntryKey != null){
        if(StringEntriesStorage.delete(currentEntryKey)){
            $('#deleteModal').modal('toggle');

            $("#entryTRKey"+ currentEntryKey).remove();
        }else{
            alert("Error deleting. Please try again.");
        }
    }else{
        alert("Error : 002");
    }
    
    
} );


//end : click events


//begin : modal events
$(document).on('shown.bs.modal', '#addFindModal', function (e) {
    $("#addFindModal textarea").focus();
});
$(document).on('hide.bs.modal', '#addFindModal', function (e) {
    $("#addFindModal textarea").val("");
});

$(document).on('show.bs.modal', '#editModal', function (e) {

    var triggerElement = $(e.relatedTarget);
    var key = triggerElement.attr( "data-storage-key");
    
    var currentEditEntryString = StringEntriesStorage.get(key);

    $("#editModal textarea").val(currentEditEntryString);
    $("#editModal").attr( "current-edit-entry-key", key);
});

$(document).on('shown.bs.modal', '#editModal', function (e) {
    $("#editModal textarea").focus();
});

$(document).on('hide.bs.modal', '#editModal', function (e) {
    $("#editModal textarea").val("");
});

$(document).on('show.bs.modal', '#deleteModal', function (e) {
    var triggerElement = $(e.relatedTarget);
    var key = triggerElement.attr( "data-storage-key");
    
    $("#deleteModal").attr( "current-delete-entry-key", key);
});
//end : modal events



//begin : functions
function init_ui(){

    //begin : set caseSensitive checkbox ui value
    chrome.storage.sync.get('caseSensitive', function(data) {
        if(data.caseSensitive){
            $("#caseSensitiveCheckboxWrapper").append('<input id="caseSensitiveCheckbox" class="form-check-input" checked type="checkbox"><label class="form-check-label" for="flexSwitchCheckDefault">Case Sensitive</label>');
        }else{
            $("#caseSensitiveCheckboxWrapper").append('<input id="caseSensitiveCheckbox" class="form-check-input" type="checkbox"><label class="form-check-label" for="flexSwitchCheckDefault">Case Sensitive</label>');
        }

        //register the event
        $('#caseSensitiveCheckbox').change(function() {
            saveData('caseSensitive', $(this).prop('checked'));
        })
    });
    //end : set caseSensitive checkbox ui value

    //begin : fetch and display string entry list
    var stringEntries = StringEntriesStorage.getAll();

    for (let i = 0; i < stringEntries.length; i++) {
        var newStringEntryHTML = getStringEntryHTML(stringEntries[i].key, stringEntries[i].string);
        $(".item-list-wrapper table tbody").append(newStringEntryHTML);
    }
    //end : fetch and display string entry list

    
}

function saveData(key, value){
    if(key == "caseSensitive"){
        chrome.storage.sync.set({ caseSensitive: value });
    }
    
}

function showPageSourceCheck_results(result){
    
    var caseSensitive = $('#caseSensitiveCheckbox').prop('checked');

    var entryItems_el = $("#stringEntriesTable tbody tr");

    entryItems_el.each(function( index ) {
        var entryKey = $(this).attr("data-storage-key");

        var stringData = StringEntriesStorage.get(entryKey);

        var count = occurrences(result, stringData, caseSensitive);

        var resultsHTML = getResultsCountHTML(count);

        $(this).find(".td-result").html(resultsHTML);

    });
}

function getPageSourceCallbackFn(result){

    showPageSourceCheck_results(result);

}

function getPageSource(callbackFunction) {
    var return_value = "";

    chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
        var activeTab = tabs[0];
        var activeTabId = activeTab.id;

        return chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            injectImmediately: true,  // uncomment this to make it execute straight away, other wise it will wait for document_idle
            func: DOMtoString,
            // args: ['body']  // you can use this to target what element to get the html for
        });

    }).then(function (results) {
        //alert(results[0].result);
        callbackFunction(results[0].result);
    }).catch(function (error) {
        alert(error.message);
        //message.innerText = 'There was an error injecting script : \n' + error.message;
    });
}

function DOMtoString(selector) {
    if (selector) {
        selector = document.querySelector(selector);
        if (!selector) return "ERROR: querySelector failed to find node"
    } else {
        selector = document.documentElement;
    }
    return selector.outerHTML;
}

function occurrences(sourceString, findString, caseSensitive = false, allowOverlapping = false) {

    var var_sourceString = sourceString;
    var var_findString = findString;

    var_sourceString = var_sourceString.replace(/\n/g, " ");
    var_findString = var_findString.replace(/\n/g, " ");

    var_sourceString = var_sourceString.replace(/\t/g, ' ');
    var_findString = var_findString.replace(/\t/g, ' ');

    var_sourceString = var_sourceString.replace(/\s+/g,' ').trim();
    var_findString = var_findString.replace(/\s+/g,' ').trim();

    if(!caseSensitive){
        var_sourceString = var_sourceString.toLowerCase()
        var_findString = var_findString.toLowerCase()
    }

    if (var_findString.length <= 0) return (var_sourceString.length + 1);

    var n = 0,
        pos = 0,
        step = allowOverlapping ? 1 : var_findString.length;

    while (true) {
        pos = var_sourceString.indexOf(var_findString, pos);
        if (pos >= 0) {
            ++n;
            pos += step;
        } else break;
    }
    return n;
}
//end : functions


//begin : HTML builders
var xescape = document.createElement('textarea');
function escapeHTML(html) {
    xescape.textContent = html;
    return xescape.innerHTML;
}

function getStringEntryHTML(key, stringValue){

    var cleaned_stringValue = escapeHTML(stringValue);

    var retVal = '';
    
    retVal += '<tr id="entryTRKey' + key +'" data-storage-key="'+ key +'">';
        
    retVal += '<td class="td-string" title="' + cleaned_stringValue +'">';
            retVal += '<code>';
            retVal += cleaned_stringValue;
            retVal += '</code>';
        retVal += '</td>';

        retVal += '<td class="td-result">';
        //retVal += '<div class="py-1 bg-success text-white rounded text-center" title="Found 12 occurrence">12</div>';
        retVal += '<div class="py-1 text-white rounded text-center" title="Found 12 occurrence">12</div>';
        retVal += '</td>';

        retVal += '<td>';
            retVal += '<div class="dropdown">';
                retVal += '<button class="btn btn-sm dropdown-toggle" type="button" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false"></button>';
                retVal += '<ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">';
                    retVal += '<li><a class="dropdown-item" href="javascript:void(0);" data-bs-toggle="modal" data-bs-target="#editModal" data-storage-key="'+ key +'">Edit</a></li>';
                    retVal += '<li><a class="dropdown-item" href="javascript:void(0);" data-bs-toggle="modal" data-bs-target="#deleteModal" data-storage-key="'+ key +'">Delete</a></li>';
                retVal += '</ul>';
            retVal += '</div>';
        retVal += '</td>';
    retVal += '</tr>';

    return retVal;
}

function getResultsCountHTML(count){

    var retVal = '';

    if(count == 0){
        retVal = '<div class="py-1 px-3 bg-danger text-white rounded text-center" title="Not found">0</div>';
    }else if(count == 1){
        retVal = '<div class="py-1 px-3 bg-success text-white rounded text-center" title="Found ' + count + ' occurrence">' + count + '</div>';
    }else{
        retVal = '<div class="py-1 px-3 bg-success text-white rounded text-center" title="Found ' + count + ' occurrences">' + count + '</div>';
    }

    return retVal;
}

function getBlankResultsCountHTML(count){

    var retVal = '';
    retVal = '<div class="py-1 px-3 text-white rounded text-center" title="">&nbsp;</div>';
    return retVal;
}
//end : HTML builders


//begin : entryStorage
class StringEntriesStorage {
    constructor() {
    }

    static add(stringValue) {
        var nextKey = StringEntriesStorage.getNextKey();
        
        localStorage.setItem(nextKey.toString(),stringValue.toString());

        return nextKey;
    }

    static getAll() {
        var values = [],
        keys = Object.keys(localStorage),

        i = keys.length;

        for (let i = 0; i < keys.length; i++) {
            values.push( {key:keys[i], string:localStorage.getItem(keys[i])});
        }

        //return ksort(values);

        return values.sort((a, b) => {
            return a.key - b.key;
        });
    }

    static get(key) {
        if(localStorage.getItem(key.toString()) != null){
            return localStorage.getItem(key.toString());
        }else{
            return false;
        }
    }

    static update(key, stringValue) {
        if(localStorage.getItem(key.toString()) != null){
            localStorage.setItem(key.toString(),stringValue.toString());
            return true;
        }else{
            return false;
        }
    }

    static delete(key) {
        if(localStorage.getItem(key.toString()) != null){
            localStorage.removeItem(key.toString());
            return true;
        }else{
            return false;
        }
        
    }

    static getNextKey(){
        var keys = Object.keys(localStorage);

        var max_of_array;

        if(keys.length > 0){
            max_of_array = Math.max.apply(Math, keys);
            max_of_array = max_of_array + 1;
        }else{
            max_of_array = 1;
        }

        return max_of_array;
    }

    static getAllKeys(){
        var keys = Object.keys(localStorage);

        return keys;
    }
  }

//end : entryStorage



//begin : GA4

async function getOrCreateClientId() {
    const result = await chrome.storage.local.get('clientId');
    let clientId = result.clientId;
    if (!clientId) {
      // Generate a unique client ID, the actual value is not relevant
      clientId = self.crypto.randomUUID();
      await chrome.storage.local.set({clientId});
    }
    return clientId;
}

const SESSION_EXPIRATION_IN_MIN = 30;

async function getOrCreateSessionId() {
  // Store session in memory storage
  let {sessionData} = await chrome.storage.session.get('sessionData');
  // Check if session exists and is still valid
  const currentTimeInMs = Date.now();
  if (sessionData && sessionData.timestamp) {
    // Calculate how long ago the session was last updated
    const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
    // Check if last update lays past the session expiration threshold
    if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
      // Delete old session id to start a new session
      sessionData = null;
    } else {
      // Update timestamp to keep session alive
      sessionData.timestamp = currentTimeInMs;
      await chrome.storage.session.set({sessionData});
    }
  }
  if (!sessionData) {
    // Create and store a new session
    sessionData = {
      session_id: currentTimeInMs.toString(),
      timestamp: currentTimeInMs.toString(),
    };
    await chrome.storage.session.set({sessionData});
  }
  return sessionData.session_id;
}


const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const MEASUREMENT_ID = 'G-1J4B4F00X0';
const API_SECRET = 'F-zAtHT1TOag_2WktMMJLA';
const DEFAULT_ENGAGEMENT_TIME_IN_MSEC = 100;

fetch(
`${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
  {
    method: "POST",
    body: JSON.stringify({
      client_id: await getOrCreateClientId(),
      events: [
        {
          name: "user",
          params: {
            session_id: await getOrCreateSessionId(),
            engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_IN_MSEC,
            id: "nullid",
          },
        },
      ],
    }),
  }
);
//end : GA4