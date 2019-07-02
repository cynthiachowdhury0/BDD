const PulseSdk = require('@qasymphony/pulse-sdk');
const request = require('request');
const xml2js = require('xml2js');
const { Webhooks } = require('@qasymphony/pulse-sdk');

exports.handler = function ({ event: body, constants, triggers }, context, callback) {
    function emitEvent(name, payload) {
        let t = triggers.find(t => t.name === name);
        return t && new Webhooks().invoke(t, payload);
    }

        const xml2js = require("xml2js");

        var payload = body;
        var testResults = payload.result; 
        var projectId = payload.projectId;
        var cycleId = payload["test-cycle"];
        var testLogs = [];
        var timestamp = new Date();
        var requiresDecode = payload.requiresDecode;

        if(requiresDecode == 'true') {
            var xmlString = decodeURI(testResults);
            xmlString = xmlString.replace(/`/g, '&');
        }

        xml2js.parseString(xmlString, {
            preserveChildrenOrder: true,
            explicitArray: false,
            explicitChildren: false
        }, function (err, result) {
            if (err) {
                emitEvent('<INSERT NAME OF CHATOPS INTEGRATION RULE HERE>', { Error: "Unexpected Error Parsing XML Document: " + err }); 
            } else {
                var moduleName = result['scenario']['scenarioName'];                
                var testsuites = Array.isArray(result['scenario'].suiteList.suite) ? result['scenario'].suiteList.suite : [result['scenario'].suiteList.suite];
                
                console.log(testsuites)

                testsuites.forEach(function(ts) {
                    suiteName = ts.suiteName;
                    var testcases = Array.isArray(ts.querypairList.querypair) ? ts.querypairList.querypair : [ts.querypairList.querypair];
                    testcases.forEach(function(obj) {
                        var className = obj.querypairName;
                        var methodName = obj.querypairName;
                        var methodStatus = obj.outcome;
                        var methodId = obj.querypairId;
                        var methodResultsUrl = obj.querypairResultsUrl;
                        var note = '';
                        var stack = '';
                        if (methodStatus == 'Failed') {
                            note = obj.exception.message;
                            stack = obj.exception['full-stacktrace'];
                        };
                        var exe_start_date = timestamp;
                        var exe_end_date = timestamp;
                            
                        var testLog = {
                            status: methodStatus,
                            name: methodName,
                            attachments: [],
                            note: note,
                            exe_start_date: exe_start_date.toISOString(),
                            exe_end_date: exe_start_date.toISOString(),
                            automation_content: methodId,
                            module_names: [moduleName, suiteName, className],
                            test_step_logs: []
                        };

                        testLog.test_step_logs.push({
                            description: methodName,
                            expected_result: methodResultsUrl, 
                            actual_result: methodResultsUrl, 
                            order: 1,
                            status: methodStatus                            
                            });

                        if (stack !== '') {
                            testLog.attachments.push({
                                name: `${methodName}.txt`,
                                data: Buffer.from(stack).toString("base64"),
                                content_type: "text/plain"
                            });
                        };

                        //testLog.attachments.push(payload.consoleOutput[0]);
                        testLogs.push(testLog);
                    });
                });
            }
        });

        var formattedResults = {
            "projectId" : projectId,
            "test-cycle" : cycleId,
            "logs" : testLogs
        };

        emitEvent('<INSERT NAME OF CHATOPS INTEGRATION RULE HERE>', { ResultsFormatSuccess: "Results formatted successfully for project NYL QuerySurge."}); 
        emitEvent('<INSERT NAME OF UPDATE QTEST RULE HERE>', formattedResults );
}
