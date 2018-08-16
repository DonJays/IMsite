/** ======== GLOBAL VARIABLES ======== **/

var apiURL = '/api/iassist';
var projectName = 'COG3_Demo_SAP';
var cache = {};


/** ======== CACHE UTILITY FUNCTIONS ======== **/

/* Function to add a new answer to the cache */

function addCacheEntry(question, response, source) {
    var cache_id = response.qa_id + '_' + new Date().getTime();
    var cache_entry = {question: question, response: response, source: source};
    cache[cache_id] = cache_entry;

    return cache_id;
}


/** ======== CHAT UTILITY FUNCTIONS ======== **/

/* Function to add a new line into the iAssist chat*/

function addDialogEntry(who, content, meta) {
    var dialogDisplay = $('#dialogDisplay');
    var profilePic = '<img class="profile-pic right" src="../images/persona.png">';
    var displayStyle = 'right';

    if(who == 'Watson') {
        profilePic = '<img class="profile-pic left" src="../images/bot.png">';
        displayStyle = 'left';
    }

    if(who == 'agent') {
        profilePic = '<img class="profile-pic left" src="../images/live_agent_icon.svg">';
        displayStyle = 'left';
    }    

    dialogDisplay.append('<li><div class="message-wrapper">' +
                '<div class="chat-bubble ' + displayStyle + '">' + profilePic + 
                '<div>' + content + '</div>' +
                '<div class="byline"><span>' + meta + '</span></div></div>' +
                '</div></li>'
    );
    
    $('#dialogWrapper').scrollTop($('#dialogWrapper').prop("scrollHeight"));
}

/* Function to add the Watson thinking gif to the dialog while fetching the query result. 
    While the results are retrieved, the input field and "Ask" button are disabled */

function addWatsonThinking() {
    var dialogDisplay = $('#dialogDisplay');
    dialogDisplay.append('<li id="thinkingAnimation"><div class="message-wrapper">' + 
                '<div class="chat-bubble left">' + 
                '<img class="profile-pic left" src="../images/bot.png">' + 
                '<div><img src="../images/loader.gif"></div>' +
                '</div>' + 
                '</div></li>'
    );
    
    $('#dialogWrapper').scrollTop($('#dialogWrapper').prop("scrollHeight"));
    disableChatInput(true);
}

/* Function to remove the Watson thinking gif from the dialog */

function removeWatsonThinking() {
    $('#dialogDisplay #thinkingAnimation').remove();
    disableChatInput(false);
}

/** Remove all content from the chat and clear the cache */

function clearChat() { 
    $('#dialogDisplay li').remove();
    cache = {};
    deleteHistory();
    initializeChat(false);
}

function initializeChat(useDefaultGreeting) {
    var loggedInUser = sessionData.loggedInUser.toLowerCase();
    loggedInUser = loggedInUser.charAt(0).toUpperCase() + loggedInUser.slice(1);

    var defaultGreeting = "Hi " + loggedInUser + "!";
    var customGreeting = "";
    if(sessionData.topicGreeting) {
        customGreeting = sessionData.topicGreeting;
    }
    else {
        customGreeting = "Please ask your question regarding your chosen topic.";
    }

    var greeting = useDefaultGreeting ? defaultGreeting + " " + customGreeting : customGreeting;
    addDialogEntry('Watson', greeting, '');
}

/** Detele the session history from the server */

function deleteHistory() {
    $.ajax({method:'DELETE', url: '/history', dataType : 'json'})
        .done(function(result, status, xhr){
            console.log('history clear OK');
        })
        .fail(function(xhr, textStatus, errorThrown){
            console.log('error deleting server history');
        });    
}


/** ======== USER INPUT UTILITY FUNCTIONS ======== **/

/* Handler function for the 'Ask' button */

function askQuestion() {
    var userInput = $('#questionInput').val();
    var question = userInput.replace(/'/g, "");
    submitQuestion(question);
   
    $('#questionInput').val('');
}

/* Function to change the state of the chat input (enable/disable) */

function disableChatInput(disabled) {
    $('#questionInput').prop('disabled', disabled);
    $("#askButton").prop('disabled', disabled);
    $("#iSight-toggle").prop('disabled', disabled);
    
    $("#questionInput").tooltip('destroy');  
}


/** ======== NLC SEARCH  ======== **/

/* Function to submit a question to iAssist and display the result */

function submitQuestion(question) {
    addDialogEntry('You', question, ' ');
    addWatsonThinking();
    
    var iAssistInput = {input: question};
    $.ajax({method:'POST', url: '/message', data:JSON.stringify(iAssistInput), contentType:'application/json;charset=utf-8', dataType : 'json'})
        .done(function(result, status, xhr) {			  
            removeWatsonThinking();
            
            var confidence = Math.round(result.data.confidence * 100);
            if(confidence < 70) {
                var answer = "I have not yet been trained on this topic.";
                addDialogEntry('Watson', answer, '');
                
                searchSimilar(question);
            }
            else {
                var cache_id = addCacheEntry(question, result.data, result.source);
                displayContent(cache_id);					  
            }  
        })
        .fail(function(xhr, textStatus, errorThrown) {
            displayError();
        });    
}


/** ======== SEARCH SIMILAR QUESTIONS ======== **/

/* Function to call the KG in order to disambiguate the question */

function searchSimilar(question) {
    addWatsonThinking();
    
    var iAssistInput = {question: question};
    $.ajax({method:'POST', url: apiURL + '/searchSimilar', data:JSON.stringify(iAssistInput), contentType:'application/json;charset=utf-8', dataType : 'json'})
        .done(function(response, status, xhr) {			  
            removeWatsonThinking();

            var sugestionList = response.similarQuestions;
            if(sugestionList.length > 0) {
                var disambiguation = 'I have found the following related questions: <br>';
                $.each(sugestionList, function(index, sugestion) {
                    var buffer = {
                        question: sugestion["question"],
                        answer: sugestion["answer"],
                        answer_id: sugestion["answer_id"],
                        confidence: 0.9,
                        qa_id: sugestion["qa_id"],
                    };

                    var cache_id = addCacheEntry(question, buffer, 'simQ');
                    disambiguation += '<a onClick="getApprovedContent(\'' + cache_id + '\');">' + sugestion["question"] + '</a><br>';
                });
                
                addDialogEntry('Watson', disambiguation, '');
            }
            
            var encodedQuery = encodeURIComponent(question);
            var corpusSrcMessage = "I have found some related documents and ticket data";
            var srcCorpusLink = "<a onClick=\"searchCorpus('" + encodedQuery + "');\"> Would you like to search these? </a>";
            addDialogEntry('Watson', corpusSrcMessage + " <br> " + srcCorpusLink, '');
        })
        .fail(function(xhr, textStatus, errorThrown) {
            displayError();
        });    
}

/* Function to confirm the Knowledge Graph search */

function confirmKGSearch(encodedQuery) {
    bootbox.confirm({
        title: "Proceed to search other resources?",
        message: "Do you want me to search my other knowledge sources ?",
        buttons: {
            cancel: {
                label: "No, return to chat"
            },
            confirm: {
                label: "Yes, let's continue"
            }
        },
        callback: function(confirm) { 
            if(confirm) {
                searchSimilar(encodedQuery);
            }
            else {
                logUnanswered(encodedQuery);
            } 
        }
    });    
}


/** ======== DISPLAY ANSWER ======== **/

/* Function to display the content */

function displayContent (cache_id) {
    addWatsonThinking();

    var cache_entry = cache[cache_id];
    var answer_id = cache_entry.response.answer_id;
    var answer = cache_entry.response.answer;
    var confidence = Math.round(cache_entry.response.confidence * 100);

    if(cache_entry.source === 'customNLC') {
        var feedbackForm = '<div class="dropup" style="float: right !important" id="fdbForm_' + cache_id + '">' +
        '<a onClick="sendPositiveFeedback(\'' + cache_id  + '\');" style="font-size:16px"><i class="fa fa-thumbs-o-up"></i></a> &nbsp;' +
        '<a class="dropdown-toggle" data-toggle="dropdown" style="font-size:16px;"><i class="fa fa-thumbs-o-down"></i></a> &nbsp;' +
        '<ul class="dropdown-menu" style="float:left !important;">' +
            '<li><a onClick="sendNegativeFeedback(\'' + cache_id  + '\', \'-C\');">Invalid content</a></li>' +
            '<li><a onClick="sendNegativeFeedback(\'' + cache_id  + '\', \'-Q\');">Bad quality</a></li>' +
        '</ul>' +
        '<p style="display: inline;">I hope this was useful. Help improve my accuracy by providing your valuable feedback.</p> </div>';
        
        // get the attachments
        var iAssistInput = {answerid: answer_id};
        $.ajax({method:'POST', url: apiURL + '/attachments', data:JSON.stringify(iAssistInput), contentType:'application/json;charset=utf-8', dataType : 'json'})
            .done(function(response, status, xhr) {
                removeWatsonThinking();
                if(response.length > 0) {
                    answer += "<p> Attachments: <br>";
                    $.each(response, function(index, attachment){
                    var attachmentPath = attachment.attachment_path;
                    var attachmentName = attachmentPath.substring(attachmentPath.lastIndexOf('/')+1); 
                    answer += "<a href='" + attachmentPath + "'>" + attachmentName + "</a><br>";
                    });
                    answer += "</p>";
                };
                
                addDialogEntry('Watson', answer, 'Confidence: ' + confidence + '%' + feedbackForm);
            })
            .fail(function(xhr, textStatus, errorThrown) {
                displayError();
            });
    }
    else {
        var metaContent = '';
        if(cache_entry.response.isFinal) {
            var feedbackForm = '<div class="dropup" style="float: right !important" id="fdbForm_' + cache_id + '">' +
            '<a onClick="sendWCSFeedback(\'' + cache_entry.response.answer_id + '\',\'positive\',\'' + cache_id + '\')" style="font-size:16px"><i class="fa fa-thumbs-o-up"></i></a> &nbsp;' +
            '<a onClick="sendWCSFeedback(\'' + cache_entry.response.answer_id + '\',\'negative\',\'' + cache_id + '\')" style="font-size:16px"><i class="fa fa-thumbs-o-down"></i></a> &nbsp;' +
            '<p style="display: inline;">I hope this was useful. Help improve my accuracy by providing your valuable feedback.</p> </div>';

            metaContent = '&nbsp;' + feedbackForm;
        }
        removeWatsonThinking();
        addDialogEntry('Watson', answer, metaContent);
    }        
}

/* Function to retrieve the content of similar questions */

function getApprovedContent(cache_id) {
    var question = cache[cache_id].response.question;
    addDialogEntry('You', question, ' ');
    displayContent(cache_id);

    // add new history entry
    var historyEntry = {source: "cog3", input: question, response: cache[cache_id].response};
    $.ajax({method:'POST', url: '/history', data:JSON.stringify(historyEntry), contentType:'application/json', dataType : 'json'})
        .done(function(result, status, xhr) {
            console.log('History entry has been saved');
        })
        .fail(function(xhr, textStatus, errorThrown){
            console.log('error occured restarting the conversation: ' + errorThrown);
        });    
}

/* Function to display an error message into the dialog */

function displayError() {
    removeWatsonThinking();
    addDialogEntry('Watson', 'Sorry, an error occured while processing your question', '');    
}


/** ======== FEEDBACK FUNCTIONS ======== **/

function sendNegativeFeedback(cache_id, type) {
    sendFeedback(cache_id, type);

    var cache_entry = cache[cache_id];
    confirmKGSearch(cache_entry.question);
}

function sendPositiveFeedback(cache_id) {
    sendFeedback(cache_id, '+');
    toastr.info('Thank you for your feedback!');
}

/* Function to send feedback for an iAssist answer */

function sendFeedback(cache_id, value) {
    var cache_entry = cache[cache_id];
    
    var feedbackData = {
        feedback: value,
        kgPath: cache_entry.response.question,
        initialQuestion: cache_entry.question,
        source: cache_entry.source,
        contentId: cache_entry.response.qa_id,
        detectedLanguage: 'en',
        translatedQuestion: '',
        confidence: cache_entry.response.confidence,
        rank: 1
    };

    $.ajax({method:'POST', url: apiURL + '/feedback', data:JSON.stringify(feedbackData), contentType:'application/json;charset=utf-8'})
        .done(function(data, status, xhr) {
            console.log('Feedback submited');
            $('#fdbForm_' + cache_id).remove();
        })
        .fail(function(xhr, textStatus, errorThrown) {
            console.log('Error submiting feedback data');
        });
}

function sendWCSFeedback(answer_id, type, form_id) {
    toastr.info('Thank you for your feedback!');

    var feedbackData = {answer_id: answer_id, type: type};
    $.ajax({method:'POST', url: '/api/conv/feedback', data:JSON.stringify(feedbackData), contentType:'application/json;charset=utf-8'})
        .done(function(data, status, xhr) {
            console.log('WCS Feedback submited');
        })
        .fail(function(xhr, textStatus, errorThrown) {
            console.log('Error submiting WCS feedback data');
        });

    var fdb_form = $('#fdbForm_' + form_id);
    fdb_form.html("Your feedback was succesfully submitted");
}

/* Function to send document feedback */

function sendDocumentFeedback(question, document_id, element) {
    var feedbackData = {
        feedback: '+',
        kgPath: '',
        initialQuestion: question,
        source: 'Documents',
        contentId: document_id,
        detectedLanguage: 'en',
        translatedQuestion: '',
        confidence: 0,
        rank: -1
    };

    $.ajax({method:'POST', url: apiURL + '/feedback', data:JSON.stringify(feedbackData), contentType:'application/json;charset=utf-8'})
        .done(function(data, status, xhr) {
            toastr.info('Thank you! Your feedback was submited');
            
            // disable feedback button
            element.classList.add("selected");
            element.onclick = confirmDocumentFeedback;
            
            // disable the 'None of these work button'
            $('#noneWorkBtn').prop('disabled', true);
        })
        .fail(function(xhr, textStatus, errorThrown) {
            console.log('Error submiting feedback data');
        });
}

function confirmDocumentFeedback() {
    toastr.info('The feedback is already submited for this document');
}


/** ======== CORPUS SEARCH ======== **/

function confirmCorpusSearch(encodedQuery) {
    bootbox.confirm({
        title: "Proceed to search other resources?",
        message: "Do you want me to provide some intelligent search results?",
        buttons: {
            cancel: {
                label: "No, return to chat"
            },
            confirm: {
                label: "Yes, let's continue"
            }
        },
        callback: function(confirm) { 
            if(confirm) {
                searchCorpus(encodedQuery);
            }
            else {
                logUnanswered(encodedQuery);
            } 
        }
    });
}

function searchCorpus(encodedQuery) {
    var iAssistInput = {question: decodeURIComponent(encodedQuery)};
    
    searchDocuments(iAssistInput);
    searchTickets(iAssistInput);
   
    $('#searchResult').modal('show');   
}

function searchDocuments(query) {
    var resultList = $('#docSrcResult');
    resultList.empty();
    
    // add loading gif
    resultList.append('<li><div class="block_content" align="center" style="height:100px"><img src="../images/processing_animation.gif"></div></li>');
    
    $.ajax({method:'POST', url: apiURL + '/searchDocuments', data:JSON.stringify(query), contentType:'application/json;charset=utf-8'})
        .done(function(iAssistResponse, status, xhr) {
            resultList.empty();
            var documentList = iAssistResponse.docs.response.docs;
            $.each(documentList, function(index, docResult) {                
                var downloadLink = apiURL + "/documents/" + projectName + "/en/" + docResult["FILENAME_en"];
                var feedbackAction = "sendDocumentFeedback('" + query.question + "','" + docResult["CHUNK_ID"]  + "', this);";
                resultList.append(
                    '<li><div class="result">' + 
                    '<div class="block_content"><h5 class="title">' + docResult["FILENAME_en"] +
                    '<div class="pull-right">' +
                        '<a href="' + downloadLink + '" target="_blank" data-toggle="tooltip" title="Download" class="action-link"><i class="fa fa-download"></i></a> &nbsp;' +
                        '<a onClick="' + feedbackAction + '" data-toggle="tooltip" title="Feedback" class="action-link"><i class="fa fa-thumbs-o-up"></i></a>' +
                    '</div></h5></div>' +
                    '<div class="byline"><span>' + docResult["BREADCRUMB_en"] + '</span></div>' + 
                    //'<article><p align="justify">' + docResult["CHUNKTEXT_en"] + '</p></article>' +
                    '</div></li>'
                );
            });

            $('[data-toggle="tooltip"]').tooltip();
            $('#noneWorkBtn').attr('onClick', "logUnanswered('" + query.question + "')");
            
            // enable the readmore functionality on the document body
            $('article').readmore();
            
            /*
            //enable pagination
            if(query.page == 1) {
                var totalPages = Math.round(response.data.count / 10);

                $('#docPagination').bootpag({
                    total: totalPages,
                    maxVisible: 10
                }).on("page", function(event, pageNumber){
                    query.page = pageNumber;
                    searchDocuments(query);
                });
            }  */          
        })
        .fail(function(xhr, textStatus, errorThrown) {
            toastr.error('Error searching documents');
    });
}

function searchTickets(query) {
    var resultList = $('#ticketSrcResult');
    resultList.empty();
    
    // add loading gif
    resultList.append('<li><div class="block_content" align="center" style="height:100px"><img src="../images/processing_animation.gif"></div></li>');
    
    $.ajax({method:'POST', url: apiURL + '/searchTickets', data:JSON.stringify(query), contentType:'application/json;charset=utf-8'})
        .done(function(iAssistResponse, status, xhr) {
            resultList.empty();    
            var ticketsList = iAssistResponse.tickets.response ? iAssistResponse.tickets.response.docs : []; 
            $.each(ticketsList, function(index, result) {                
                resultList.append('<li><div class="result">' + 
                            '<div class="block_content"><h5 class="title">' + result["TICKET_ID"] + '</h5></div>' +
                            '<div class="block_content"><span>' + result["TICKET_DESCRIPTION"] + '</span></div><br>' + 
                            '<p align="justify">' + result["RESOLUTION_DESCRIPTION"] + '</p>' +
                            '</div></li>'
                );
            });
                            
            /* enable pagination
            if(query.page == 1) {
                var totalPages = Math.round(response.data.count / 10);
                
                $('#ticketPagination').bootpag({
                    total: totalPages,
                    maxVisible: 10
                }).on("page", function(event, pageNumber){
                    query.page = pageNumber;
                    searchTickets(query);
                });
            }  */          
        })
        .fail(function(xhr, textStatus, errorThrown) {
            toastr.error('Error searching tickets');
    });
}


/** ======== LOG UNANSWERED QUESTIIONS ======== **/

function logUnanswered(encodedQuery) {
    var question = decodeURIComponent(encodedQuery);
    console.log('Log unanswered question : ' + question);

    addDialogEntry('Watson', 'Sorry, I have no specific guidance for your issue. This is recorded as an unanswered question and an SME will be notified. The Unanswered question is tagged, however you can ask me any other question', '');
    
    var logData = {question: question, source: 'iassist'};
    $.ajax({method:'POST', url: apiURL + '/logUnanswered', data:JSON.stringify(logData), contentType:'application/json;charset=utf-8', dataType : 'json'})
        .done(function(result, status, xhr){
            console.log('Log question response: ', result);
        })
        .fail(function(xhr, textStatus, errorThrown){
            console.log('Error logging unanswered question: ', errorThrown); 
        });
}


/** ======== OTHER UTILITY FUNCTIONS ======== **/

/** Refresh the access token */

function refreshToken() {
    $.ajax({method:'POST', url: apiURL + '/refreshToken', data:JSON.stringify(), contentType:'application/json;charset=utf-8', dataType : 'json'})
        .done(function(result, status, xhr){
            var newAPIToken = result.apiToken;
            Cookies.set('apiToken', newAPIToken);
            console.log('new API token:' + newAPIToken);
        })
        .fail(function(xhr, textStatus, errorThrown){
            console.log('Error refreshing the API token ' + errorThrown); 
        });
}


/** ======== INITIALIZATION ======== **/

$(document).ready(function() {
    // add handlers for submiting the question
    $('#askButton').on('click', askQuestion);
    $('#questionInput').keypress(function (e) {
        var key = e.which;
        if(key == 13)  // the enter key code
        {
            $('#askButton').click();
            return false;  
        }
    });
    
    // add handler for chat clear
    $('#clearChatLink').on('click', clearChat);
    
    // register handler for api token refresh
    setInterval(refreshToken, 120000); 
});