﻿define(['postal', 'Human Input Recognition and Processing/Hand Gestures/Helpers/FingerHelper', 'Helpers/Math'], function (bus, fh, math) {
    var source = 'Efficio Gesture Grimoire';
    var dictionary = 'TwoHandPosition';
    var FireCountMinimum = 15;
    var trackingType = 'Hands';
    var twoHandsGestureDetector;

    function BothHandsNeutral(data) {
        var hands = data.hands;
        var gestureName = 'BothHandsNeutral'

        if (hands[0].IsNeutral() && hands[1].IsNeutral()) {
            var gestureInformation = ActiveGesturesDictionary.CreateOrUpdateEntry(trakcingType, gestureName, dictionary);

            if (gestureInformation.FireCount > FireCountMinimum) {
                gestureInformation.distance = math.DistanceBetweenTwoPoints(hands[0].palmPosition, hands[1].palmPosition);
                gestureInformation.midpoint = math.MidpointBetweenTwoPoints(hands[0].palmPosition, hands[1].palmPosition);

                bus.publish({
                    channel: "Input.Processed.Efficio",
                    topic: gestureName,
                    source: source,
                    data: {
                        input: data,
                        hand: hand,
                        gestureInformation: gestureInformation
                    }
                });
            }
        }
        else {
            ActiveGesturesDictionary.DeleteEntry(trakcingType, gestureName, dictionary);
        }
    };// END Both Hands Neutral

    function BothHandsPronation(data) {
        var gestureName = 'BothHandsPronation'

        if (hands[0].IsProne() && hands[1].IsProne()) {
            var gestureInformation = ActiveGesturesDictionary.CreateOrUpdateEntry(trackingType, gestureName, dictionary);

            if (gestureInformation.FireCount > FireCountMinimum) {
                gestureInformation.distance = math.DistanceBetweenTwoPoints(hands[0].palmPosition, hands[1].palmPosition);
                gestureInformation.midpoint = math.MidpointBetweenTwoPoints(hands[0].palmPosition, hands[1].palmPosition);

                bus.publish({
                    channel: "Input.Processed.Efficio",
                    topic: gestureName,
                    source: source,
                    data: {
                        input: data,
                        hand: hand,
                    }
                });
            }
        }
        else {
            ActiveGesturesDictionary.DeleteEntry(trackingType, gestureName, dictionary);
        }
    };// END Both Hand Pronation

    function ProcessInput(data, ActiveGesturesDictionary) {
        if (!twoHandsGestureDetector) {
            twoHandsGestureDetector = { Name: name };
            twoHandsGestureDetector.BothHandsNeutral = BothHandsNeutral;
            twoHandsGestureDetector.BothHandsPronation = BothHandsPronation;
        }

        twoHandsGestureDetector.forEach(function (gesture) {
            position(data);
        });

        return twoHandsGestureDetector;
    }

    return {
        ProcessInput: ProcessInput
    }
});