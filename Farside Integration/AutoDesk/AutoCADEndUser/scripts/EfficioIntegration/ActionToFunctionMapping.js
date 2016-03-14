﻿Test = {
}

var sphereCreated = false;
var bothHandsNeutral = false;
var leapHelper;
var isOrbiting = false;
var isPinching = false;

var selectedAsset = null;

var baseBoneRotation;
var armMeshes = [];
var boneMeshes = [];

var leftHandMesh;
var rightHandMesh;

function GetAppAdjustedVector( inputVector, frame )
{
    var minsAndMaxes = CadHelper.Tools.Model.GetMinAndMaxCoordinates();
    var adjustedPosition = leapHelper.MapPointToAppCoordinates( frame, inputVector, minsAndMaxes.Minimums, minsAndMaxes.Maximums );
    CorrectCoordinates( adjustedPosition );
    return new THREE.Vector3().fromArray( adjustedPosition );
}

ActionToFunctionMapping = {
    "Bridge": Test,
    "ActionMappings": [{
        Topic: "Ready",
        Source: "Efficio",
        Action: function ( data )
        {
            viewer3D.navigation.setPosition( startPosition );
            viewer3D.navigation.setTarget( startTarget );
            appReady = true;

            CadHelper = new EfficioAutoCADHelper( viewer3D );
            leapHelper = Efficio.DeviceManager.RegisteredDevices.LeapMotion.Helper;

            require( ['leap-plugins', 'riggedHand'], function ()
            {
                Efficio.DeviceManager.RegisteredDevices.LeapMotion.Device.use( 'transform', {
                    effectiveParent: viewer3D.impl.scene,
                } );
            } );

            baseBoneRotation = ( new THREE.Quaternion ).setFromEuler( new THREE.Euler( 0, 0, Math.PI / 2 ) )

            //Efficio.EventManager.RaiseEvent('MyNewEvent', { myData1: 1, myData2: 2 })
        }
    }, {
        Topic: "Leap",
        Source: "Input.Raw.Human",
        Action: function ( data )
        {
            if ( !( typeof ( rightHandMesh ) === "undefined" ) )
                removeMeshes( rightHandMesh );
            //CadHelper.AssetManagement.RemoveAsset( rightHandMesh );
            if ( !( typeof ( leftHandMesh ) === "undefined" ) )
                removeMeshes( leftHandMesh );

            var lineMat = new THREE.LineBasicMaterial( { color: 0x000000 } );
            var skinMat = new THREE.MeshPhongMaterial( { color: 0xA28857 } );

            var knuckleGeo = new THREE.SphereGeometry( 4.5, 16, 24 );
            var boneGeo = new THREE.CylinderGeometry( 3.7, 3.7, 1, 24 );
            boneGeo.applyMatrix( new THREE.Matrix4().makeRotationX( 0.5 * Math.PI ) );

            var vectorAdjuster = function ( inputVector )
            {
                return GetAppAdjustedVector( inputVector, data.Frame );
            }

            for ( var hand of data.Hands )
            {
                if ( hand.type == "left" )
                    leftHandMesh = []//new THREE.Object3D();
                else
                    rightHandMesh = []//new THREE.Object3D();

            //createLineMeshFromHand( hand, vectorAdjuster, knuckleGeo, skinMat, lineMat, hand.type == "left" ? leftHandMesh : rightHandMesh );
                createBoneMeshFromHand( hand, vectorAdjuster, knuckleGeo, skinMat, boneGeo, skinMat, hand.type == "left" ? leftHandMesh : rightHandMesh )
                createMeshes( hand.type == "left" ? leftHandMesh : rightHandMesh );
            }
        }
    },
        {
            Topic: "RightHandAirplane",
            Source: "Input.Processed.Efficio",
            Action: function ( data )
            {
                //console.log( "AIRPLANE MODE DETECTED!" )

                if ( data.GestureInformation.EndPosition )
                {
                    //Zooming functions
                    var zoomAmount = 1;

                    var changeZ = data.GestureInformation.StartPosition[2] - data.GestureInformation.EndPosition[2];

                    changeZ = changeZ > 50 ? 50 : changeZ;
                    changeZ = changeZ < -50 ? -50 : changeZ;

                    if ( changeZ > 0 )
                    {
                        CadHelper.Navigation.Zoom.ZoomIn( zoomAmount * ( changeZ / 50 ) );
                    }
                    else
                    {
                        CadHelper.Navigation.Zoom.ZoomOut( zoomAmount * ( ( -1 * changeZ ) / 50 ) );
                    }

                    //Panning functions
                    var panAmount = 0.5;

                    var changeX = data.GestureInformation.StartPosition[0] - data.GestureInformation.EndPosition[0];

                    changeX = changeX > 50 ? 50 : changeX;
                    changeX = changeX < -50 ? -50 : changeX;

                    if ( changeX > 0 )
                    {
                        CadHelper.Navigation.Panning.PanRight( panAmount * ( changeX / 50 ) );
                    }
                    else
                    {
                        CadHelper.Navigation.Panning.PanLeft( panAmount * ( ( -1 * changeX ) / 50 ) );
                    }
                }
            }
        },
    {
        Topic: "RightHandThumbIndexPinch",
        Source: "Input.Processed.Efficio",
        ExecutionPrerequisite: function ()
        {
            return selectedAsset == null && !isOrbiting;
        },
        Action: function ( data )
        {

            var minsAndMaxes = CadHelper.Tools.Model.GetMinAndMaxCoordinates();
            var appAdjustedPinchLocation = leapHelper.MapPointToAppCoordinates( data.Input.Frame, data.GestureInformation.PinchMidpoint, minsAndMaxes.Minimums, minsAndMaxes.Maximums );

            CorrectCoordinates( appAdjustedPinchLocation );

            var testFragment = CadHelper.AssetManagement.GetClosestFragmentToPoint( appAdjustedPinchLocation );

            //selectedAsset = testFragment.Fragment;
            selectedAsset = CadHelper.AssetManagement.GetFragmentById( 10 );
        }
    },
    {
        Topic: "RightHandThumbIndexPinch",
        Source: "Input.Processed.Efficio",
        ExecutionPrerequisite: function ()
        {
            return selectedAsset != null;
        },
        Action: function ( data )
        {
            isPinching = true;
            var minsAndMaxes = CadHelper.Tools.Model.GetMinAndMaxCoordinates();
            var appAdjustedPinchLocation = leapHelper.MapPointToAppCoordinates( data.Input.Frame, data.GestureInformation.PinchMidpoint, minsAndMaxes.Minimums, minsAndMaxes.Maximums );

            CorrectCoordinates( appAdjustedPinchLocation );

            CadHelper.AssetManagement.Transformer.Translate( selectedAsset, appAdjustedPinchLocation );
            setTimeout( function () { isPinching = false }, 200 );
        }
    },
    {
        Topic: "LeftHandThumbIndexPinch",
        Source: "Input.Processed.Efficio",
        ExecutionPrerequisite: function ()
        {
            return selectedAsset != null;
        },
        Action: function ( data )
        {
            selectedAsset = null;
        }
    },

        // {
        //    Topic: "RightHandThumbIndexPinch",
        //    Source: "Input.Processed.Efficio",
        //    Action: function (data) {
        //        var minsAndMaxes = CadHelper.Tools.Model.GetMinAndMaxCoordinates();
        //        var appAdjustedPinchLocation = leapHelper.MapPointToAppCoordinates(data.Input.Frame, data.GestureInformation.PinchMidpoint, minsAndMaxes.Minimums, minsAndMaxes.Maximums);

        //        var testFragment = CadHelper.AssetManagement.GetClosestFragmentToPoint(appAdjustedPinchLocation);

        //        viewer3D.isolate(viewer3D.model.getData().fragments.fragId2dbId[testFragment.Fragment.fragId]);
        //    }
    //},
     {
         Topic: "MyNewEvent",
         Source: "Event Manager",
         Action: function ( data )
         {
             alert( JSON.stringify( data ) );
         }
     },
	 {
	     Topic: "LeftHandZeroFingersExtended",
	     Source: "Input.Processed.Efficio",
	     Action: function ( data )
	     {
	         if ( data.GestureInformation.EndPosition )
	         {
	             var panAmount = 2;

	             var changeX = data.GestureInformation.StartPosition[0] - data.GestureInformation.EndPosition[0];

	             changeX = changeX > 50 ? 50 : changeX;
	             changeX = changeX < -50 ? -50 : changeX;


	             if ( changeX > 0 )
	             {
	                 CadHelper.Navigation.Panning.PanRight( panAmount * ( changeX / 50 ) );
	             }
	             else
	             {
	                 CadHelper.Navigation.Panning.PanLeft( panAmount * ( ( -1 * changeX ) / 50 ) );
	             }
	         }
	     }
	 },
            {
                Topic: "RightHandZeroFingersExtended",
                Source: "Input.Processed.Efficio",
                ExecutionPrerequisite: function ()
                {
                    return !isPinching;
                },
                Action: function ( data )
                {
                    if ( data.GestureInformation.EndPosition )
                    {
                        isOrbiting = true;
                        var rotateAmount = .1;

                        var changeX = data.GestureInformation.StartPosition[0] - data.GestureInformation.EndPosition[0];

                        changeX = changeX > 50 ? 50 : changeX;
                        changeX = changeX < -50 ? -50 : changeX;

                        if ( changeX > 0 )
                        {
                            CadHelper.Navigation.Rotation.RotateClockwise( rotateAmount * ( changeX / 50 ) );
                        }
                        else
                        {
                            CadHelper.Navigation.Rotation.RotateCounterClockwise( rotateAmount * ( ( -1 * changeX ) / 50 ) );
                        }
                        setTimeout( function () { isOrbiting = false }, 200 )
                    }
                }
            },
             //{
             //    Topic: "RightHandZeroFingersExtended",
             //    Source: "Input.Processed.Efficio",
             //    ExecutionPrerequisite: function () {
             //        return CadHelper.Tools.Navigation.GetActiveNavigationTool() === 'dolly';
             //    },
             //    Action: function (data) {
             //        if (data.GestureInformation.EndPosition) {
             //            var zoomAmount = 2;

             //            var changeZ = data.GestureInformation.StartPosition[2] - data.GestureInformation.EndPosition[2];

             //            changeZ = changeZ > 50 ? 50 : changeZ;
             //            changeZ = changeZ < -50 ? -50 : changeZ;

             //            if (changeZ > 0) {
             //                CadHelper.Navigation.Zoom.ZoomIn(zoomAmount * (changeZ / 50));
             //            }
             //            else {
             //                CadHelper.Navigation.Zoom.ZoomOut(zoomAmount * ((-1 * changeZ) / 50));
             //            }
             //        }
             //    }
             //},
            //{
            //    Topic: "BothHandsNeutral",
            //    Source: "Input.Processed.Efficio",
            //    Action: function (data) {
            //        bothHandsNeutral = true;

            //        var explodeFactor = (data.GestureInformation.DistanceX - 100) / data.Input.Frame.interactionBox.width
            //        if (explodeFactor > 1) {
            //            explodeFactor = 1;
            //        }

            //        viewer3D.explode(explodeFactor);

            //        setTimeout(function () {
            //            bothHandsNeutral = false;
            //        }, 200)
            //    },
            //    FireRestrictions: {
            //        FireAfterXFrames: 15
            //    }
            //},
            //{
            //    Topic: "RightHandUlnarDeviation",
            //    Source: "Input.Processed.Efficio",
            //    Action: function (data) {
            //        if (!bothHandsNeutral) {
            //            //CadHelper.Navigation.Rotation.RotateClockwise(.05);
            //            var test = CadHelper.AssetManagement.GetAssetByID(myMesh.id);
            //            test.translateX(10);
            //            CadHelper.AssetManagement.UpdateScene();
            //        }
            //    }
            //},
            //{
            //    Topic: "RightHandRadialDeviation",
            //    Source: "Input.Processed.Efficio",
            //    Action: function (data) {
            //        if (!bothHandsNeutral) {
            //            //CadHelper.Navigation.Rotation.RotateCounterClockwise(.05);
            //            var test = CadHelper.AssetManagement.GetAssetByID(myMesh.id);
            //            test.translateX(-10);
            //            CadHelper.AssetManagement.UpdateScene();
            //        }
            //    }
            //},
            //{
            //    Topic: "LeftHandUlnarDeviation",
            //    Source: "Input.Processed.Efficio",
            //    Action: function (data) {
            //        if (!bothHandsNeutral) {
            //            CadHelper.Navigation.Zoom.ZoomIn(2);
            //        }
            //    }
            //},
            //{
            //    Topic: "LeftHandRadialDeviation",
            //    Source: "Input.Processed.Efficio",
            //    Action: function (data) {
            //        if (!bothHandsNeutral) {
            //            CadHelper.Navigation.Zoom.ZoomOut(2);
            //        }
            //    }
            //}
    ],
    AudioCommands: {
        'Create Sphere': function () { CreateSpheres(); },
        'Navigation :tool': function ( tool ) { CadHelper.Tools.Navigation.SetActiveNavigationTool( tool ); },
        'Select *part': function ( part ) { CadHelper.Tools.Model.SelectObject( part ) },
        'Isolate *part': function ( part ) { CadHelper.Tools.Model.IsolateObject( part ) },
        'Clear Selection': function () { CadHelper.Tools.Model.ClearSelection(); }
    }
}

function CorrectCoordinates( position )
{
    position[0] = position[0] + 15;
    position[1] = position[1] - 30;
    position[2] = position[2] - 10;
}



function CreateSpheres()
{
    //create material red
    var material_red =
        new THREE.MeshPhongMaterial(
                  { color: 0xff0000 } );

    //get bounding box of the model
    var boundingBox =
        viewer3D.model.getBoundingBox();
    var maxpt = boundingBox.max;
    var minpt = boundingBox.min;

    var xdiff = maxpt.x - minpt.x;
    var ydiff = maxpt.y - minpt.y;
    var zdiff = maxpt.z - minpt.z;

    //set a nice radius in the model size
    var niceRadius =
               Math.pow(( xdiff * xdiff +
                         ydiff * ydiff +
                         zdiff * zdiff ), 0.5 ) / 10;

    //createsphere1 and place it at max point of boundingBox
    var sphere_maxpt =
         new THREE.Mesh(
                new THREE.SphereGeometry(
                          niceRadius, 20 ),
                material_red );
    sphere_maxpt.position.set( maxpt.x,
                              maxpt.y,
                              maxpt.z );

    myMesh = sphere_maxpt;

    CadHelper.AssetManagement.CreateAsset( sphere_maxpt );
}

function MoveCameraByPercentage( explodeFactor )
{
    viewer3D.navigation.setPosition( GetIntermeditatePoints( startPosition, endPosition, explodeFactor ) );
    viewer3D.navigation.setTarget( GetIntermeditatePoints( startTarget, endTarget, explodeFactor ) );
}

function GetIntermeditatePoints( start, end, factor )
{
    var x = start.x + ( ( end.x - start.x ) * factor );
    var y = start.y + ( ( end.y - start.y ) * factor );
    var z = start.z + ( ( end.z - start.z ) * factor );

    return new THREE.Vector3( x, y, z );
}

function addMesh( meshes )
{

    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    var material = new THREE.MeshNormalMaterial();
    var mesh = new THREE.Mesh( geometry, material );
    meshes.push( mesh );

    return mesh;

}

function updateMesh( frame, bone, mesh )
{
    var minsAndMaxes = CadHelper.Tools.Model.GetMinAndMaxCoordinates();

    // Get Scene Point
    var normalizedCenter = leapHelper.MapPointToAppCoordinates( frame, bone.center(), minsAndMaxes.Minimums, minsAndMaxes.Maximums );

    mesh.position.fromArray( normalizedCenter );
    mesh.setRotationFromMatrix(( new THREE.Matrix4 ).fromArray( bone.matrix() ) );
    mesh.quaternion.multiply( baseBoneRotation );
    mesh.scale.set( bone.width / 8, bone.width / 8, bone.length / 4 );

    CadHelper.AssetManagement.CreateAsset( mesh );
}

function createMeshes( parentObject )
{
    for ( var mesh of parentObject )
		CadHelper.AssetManagement.CreateAsset( mesh );
}

function removeMeshes( parentObject )
{
    while ( mesh = parentObject.pop() )
    {
        //console.log( "Removing mesh with ID " + mesh.id )
        CadHelper.AssetManagement.RemoveAsset( mesh );
    }

}

function createLineMeshFromHand( theHand, vectorAdjuster, knuckleGeometry, knuckleMaterial, lineMaterial, fullHandMesh )
{
    var minsAndMaxes = CadHelper.Tools.Model.GetMinAndMaxCoordinates();

    for ( var j = 0; j < theHand.fingers.length; j++ )
    {
        var finger = theHand.fingers[j];
        var positions = finger.positions;

        var geometryLine = new THREE.Geometry();
        var vertices = geometryLine.vertices;

        for ( var k = 0; k < positions.length; k++ )
        {
            var vertex = vectorAdjuster( positions[k] );
            vertices.push( vertex );

            var mesh = new THREE.Mesh( knuckleGeometry, knuckleMaterial );
            mesh.position.copy( vertex );
            fullHandMesh.push( mesh );
        }

        fullHandMesh.push( new THREE.Line( geometryLine, lineMaterial ) );
    }
}

function createBoneMeshFromHand( theHand, vectorAdjuster, knuckleGeometry, knuckleMaterial, boneGeometry, boneMaterial, fullHandMesh )
{
    for ( var j = 0; j < theHand.fingers.length; j++ )
    {
        var finger = theHand.fingers[j];
        var positions = finger.positions;

        var geometryLine = new THREE.Geometry();
        var vertices = geometryLine.vertices;

        for ( var k = 0; k < 5; k++ )
        {
            var vertex = vectorAdjuster( positions[k] );

            var mesh = new THREE.Mesh( knuckleGeometry, knuckleMaterial );
            mesh.position.copy( vertex );
            fullHandMesh.push( mesh );

            if ( k < 4 )
            {
                var next = vectorAdjuster( positions[k + 1] );
                var d = vertex.distanceTo( next );

                mesh = new THREE.Mesh( boneGeometry, boneMaterial );
                mesh.scale.set( 1, 1, d || 1 );
                mesh.position.lerpVectors( vertex, next, 0.5 );
                mesh.lookAt( vertex );

                fullHandMesh.push( mesh );

            }
        }
    }
}