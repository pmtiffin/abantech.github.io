﻿var materialIndex = 0;

function EfficioAutoCADHelper(viewer) {
    self = this;
    self.viewer = viewer;

    RegisterEventsToEfficio();

    this.AssetManagement = {
        CreateAsset: function (mesh, materialName) {
            if (!materialName) {
                materialName = 'Material' + materialIndex;
                materialIndex++;
            }

            self.viewer.impl.matman().addMaterial(materialName, mesh.material, true);

            // Add mesh to scene
            self.viewer.impl.scene.add(mesh);

            self.AssetManagement.UpdateScene();
        },

        RemoveAsset: function (mesh) {
            self.viewer.impl.scene.remove(mesh);
            self.AssetManagement.UpdateScene();
        },

        GetAssetByID: function(id) {
            return self.viewer.impl.scene.getObjectById(id);
        },

        GetFragmentById: function (id){
            return self.viewer.impl.getFragmentProxy(self.viewer.model, id)
        },

        UpdateScene: function () {
            // Update the viewer       
            self.viewer.impl.invalidate(true);
        },

        Transformer:
            {
                Translate: function (fragProxy, pos) {
                    vec3 = new THREE.Vector3(pos[0], pos[1], pos[2]);
                    fragProxy.getAnimTransform();
                    fragProxy.position.copy(vec3);
                    fragProxy.updateAnimTransform();

                },

                Scale: function (fragProxy, pos) {
                    vec3 = new THREE.Vector3(pos[0], pos[1], pos[2]);
                    fragProxy.getAnimTransform();
                    fragProxy.scale.copy(vec3);
                    fragProxy.updateAnimTransform();

                },

                Rotate: function (fragProxy, axis, deg) {
                    fragProxy.getAnimTransform();
                    fragProxy.quaternion.setFromAxisAngle(axis, THREE.Math.degToRad(deg));
                    fragProxy.updateAnimTransform();

                },
            },

        Descriptor:
            {
                Position: function (fragID) {
                    var mesh = self.viewer.impl.getRenderProxy(self.viewer.model, fragID);
                    self.viewer.impl.scene.updateMatrixWorld(true);
                    var position = new THREE.Vector3();
                    position.getPositionFromMatrix(mesh.matrixWorld);
                    return position;
                },

                Scale: function (fragProxy) {
                    fragProxy.updateAnimTransform();
                    return fragProxy.scale;

                },

                Rotation: function (fragProxy) {
                    fragProxy.updateAnimTransform();
                    return fragProxy.rotation;

                }
            },

        GetClosestFragmentToPoint: function (point) {
            point = new THREE.Vector3(point[0], point[1], point[2]);

            var result = {
                Distance: 0,
                Fragment: null,
            }

            var fragments = viewer3D.model.getData().fragments;

            for (var i = 0; i < fragments.length; i++) {
                var distance = new THREE.Vector3().subVectors(point, self.AssetManagement.Descriptor.Position(i)).length()

                if (!result.Fragment) {
                    result.Fragment = self.viewer.impl.getFragmentProxy(self.viewer.model, i);
                    result.Distance = distance;
                }
                else {
                    if (distance < result.Distance) {
                        result.Fragment = self.viewer.impl.getFragmentProxy(self.viewer.model, i);
                        result.Distance = distance;
                    }
                }
            }

            return result;
        },

        GetThreeMeshForFragment: function (fragment) {
            return self.viewer.impl.getRenderProxy(self.Tools.Model.Model, fragment.fragId);
        }
    }

    this.Navigation = {
        Panning: {
            // 2 seems to be a good 'amount'
            PanLeft: function (amount) {
                self.Navigation.Panning.PanX(-amount);
            },

            // 2 seems to be a good 'amount'
            PanRight: function (amount) {
                self.Navigation.Panning.PanX(amount);
            },

            // 2 seems to be a good 'amount'
            PanUp: function (amount) {
                self.Navigation.Panning.PanY(amount);
            },

            // 2 seems to be a good 'amount'
            PanDown: function (amount) {
                self.Navigation.Panning.PanY(-amount);
            },
            PanX: function (amount) {
                self.viewer.navigation.getCamera().translateX(amount)
                self.viewer.impl.invalidate(true);
            },
            PanY: function (amount) {
                self.viewer.navigation.getCamera().translateY(amount)
                self.viewer.impl.invalidate(true);
            }

        },

        Rotation: {
            // .05 seems to be a good 'amount'
            RotateClockwise: function (amount) {
                self.Navigation.Rotation.Rotate(amount);
            },

            // .05 seems to be a good 'amount'
            RotateCounterClockwise: function (amount) {
                self.Navigation.Rotation.Rotate(-amount);
            },

            // .05 seems to be a good 'amount'
            Rotate: function (amount) {
                var pos = self.viewer.navigation.getPosition();

                var position = new THREE.Vector3(pos.x, pos.y, pos.z);

                var matrix = new THREE.Matrix4().makeRotationAxis(self.viewer.navigation.getWorldUpVector(), amount);

                position.applyMatrix4(matrix);

                self.viewer.navigation.setPosition(position);
            }
        },

        Zoom: {
            ZoomIn: function (amount) {
                self.Navigation.Zoom.Zoom(-amount);
            },

            ZoomOut: function (amount) {
                self.Navigation.Zoom.Zoom(amount)
            },

            Zoom: function (amount) {
                var pos = self.viewer.navigation.getPosition();
                var target = self.viewer.navigation.getTarget();

                self.viewer.navigation.dollyFromPoint(amount, target);
            }
        }
    },

    this.Tools = {
        Navigation: {
            // Options: orbit, pan, dolly, worldup, fov
            SetActiveNavigationTool: function (toolName) {
                if (!self.viewer.setActiveNavigationTool(toolName)) {
                    // TODO send error message
                }
            },

            GetActiveNavigationTool: function () {
                return self.viewer.getActiveNavigationTool();
            }
        },

        Model: {
            Model: self.viewer.model,

            SelectObjectByName: function (objectName) {
                self.viewer.getObjectTree(function (objectTree) {
                    var obj = FindObject(objectName, objectTree.root)

                    if (obj) {
                        self.viewer.select(obj.dbId);
                    }
                });
            },

            SelectObjectByFragmentId: function (fragId) {
                self.viewer.select(viewer3D.model.getData().fragments.fragId2dbId[fragId]);
            },

            IsolateObjectByName: function (objectName) {
                self.viewer.getObjectTree(function (objectTree) {
                    var obj = FindObject(objectName, objectTree.root)

                    if (obj) {
                        self.viewer.isolate(obj.dbId);
                    }
                });
            },

            IsolateObjectByFragmentId: function (fragId) {
                self.viewer.isolate(viewer3D.model.getData().fragments.fragId2dbId[fragId]);
            },

            ClearSelection: function () {
                self.viewer.clearSelection();
                self.viewer.isolate();
            },

            GetMinAndMaxCoordinates: function () {
                // Get Scene mins and maxes
                var boundingBox = self.viewer.model.getBoundingBox();
                var maxpt = boundingBox.max;
                var minpt = boundingBox.min;

                return {
                    Minimums: [minpt.x, minpt.y, minpt.z],
                    Maximums: [maxpt.x, maxpt.y, maxpt.z]
                }
            }
        }
    }
};

function FindObject(objectName, node) {
    var object = [];

    if (node.children) {
        object = node.children.filter(function (child) {
            return child.name.toLowerCase() === objectName.toLowerCase();
        });
    }

    if (object.length != 0) {
        return object[0];
    }

    if (node.children) {
        node.children.forEach(function (child) {
            if (object.length == 0) {
                var tempObject = FindObject(objectName, child);

                if (tempObject) {
                    object = tempObject;
                }
            }
        });
    }

    return object;
}

function RegisterEventsToEfficio() {
    var source = 'AutoDesk';

    self.viewer.addEventListener(Autodesk.Viewing.ANIMATION_READY_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'AnimationReady', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'CameraChange', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.CUTPLANES_CHANGE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'CutplanesChange', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.ESCAPE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'Escape', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.EXPLODE_CHANGE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ExplodeChange', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.FULLSCREEN_MODE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'FullscreenMode', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'GeometryLoaded', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.HIDE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'Hide', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.HIGHLIGHT_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'Highlight', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'Isolate', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.LAYER_VISIBILITY_CHANGED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'LayerVisibilityChanged', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ModelRootLoaded', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.NAVIGATION_MODE_CHANGED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'NavigationModeChanged', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ObjectTreeCreated', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_UNAVAILABLE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ObjectTreeUnavailable', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.PROGRESS_UPDATE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ProgressUpdate', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.RENDER_OPTION_CHANGED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'RenderOptionChanged', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.RESET_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'Reset', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'SelectionChanged', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.SHOW_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'Show', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ToolbarCreated', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.TOOL_CHANGE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ToolChange', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.VIEWER_RESIZE_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ViewerResize', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ViewerStateRestored', { Event: event })
    });

    self.viewer.addEventListener(Autodesk.Viewing.VIEWER_UNINITIALIZED, function (event) {
        Efficio.EventManager.RaiseEvent(source, 'ViewerUninitialized', { Event: event })
    });


}