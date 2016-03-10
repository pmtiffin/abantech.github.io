﻿//// Find Efficio.Ready A2FM Action mapping
//var readyFunc = EfficioConfiguration.ActionToFunctionMapping.ActionMappings.filter(function (mapping) {
//    return mapping.Topic === 'Ready' && mapping.Source === 'Efficio'
//});

//if (readyFunc.length === 1) {
//    var index = EfficioConfiguration.ActionToFunctionMapping.ActionMappings.indexOf(readyFunc[0]);

//    // Save the original function
//    var original = EfficioConfiguration.ActionToFunctionMapping.ActionMappings[index].Action;

//    // Create the new Efficio.Ready A2FM Action mapping
//    EfficioConfiguration.ActionToFunctionMapping.ActionMappings[index].Action = function () {
//        // Call the original Efficio.Ready A2FM Action mapping
//        original();

//        // Execute additional code
//        CadHelper.viewer.loadExtension('Autodesk.ADN.Viewing.Extension.InstructionsPanel');
//    };
//}

EfficioConfiguration.ActionToFunctionMapping.ActionMappings.push({
    Topic: "Ready",
    Source: "Efficio",
    Action: function (data) {
        CadHelper.viewer.loadExtension('Autodesk.ADN.Viewing.Extension.InstructionsPanel');

       // Efficio.CommandIssuanceAndControl.AddMapping('Input.Raw.Human', 'Leap', MyTestFunction, MyExecutionPrerequisite, fireRestrictions);
    }
});

function MyTestFunction(data) {
    alert('success')
}

function MyExecutionPrerequisite() {
    return true;
}

var fireRestrictions = {
    FireOnce: true
}