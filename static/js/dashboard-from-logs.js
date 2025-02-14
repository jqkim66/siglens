/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const newDashboardBtn = $(".new-dashboard-btn");
const existingDashboardBtn = $(".existing-dashboard-btn");
const newDashboard = $(".new-dashboard");
const existingDashboard = $(".existing-dashboard");
let newDashboardFlag = true;
let dashboardID;

$(document).ready(function () {
    existingDashboard.hide();
    $("#create-panel").hide();
    $("#create-db").show();
    newDashboardBtn.on("click", showNewDashboard);
    existingDashboardBtn.on("click", showExistingDashboard);

    $("#add-logs-to-db-btn").on("click", openPopup);
    $("#cancel-dbbtn, .popupOverlay").on("click", closePopup);
    $("#selected-dashboard").on("click", displayExistingDashboards);

    let data = getInitialSearchFilter(false, false);
});

function showNewDashboard() {
    newDashboardFlag = true;
    newDashboardBtn.addClass("active");
    existingDashboardBtn.removeClass("active");
    newDashboard.show();
    existingDashboard.hide();
    $("#create-panel").hide();
    $("#create-db").show();
}

function showExistingDashboard() {
    newDashboardFlag = false;
    existingDashboardBtn.addClass("active");
    newDashboardBtn.removeClass("active");
    existingDashboard.show();
    newDashboard.hide();
    $("#create-panel").show();
    $("#create-db").hide();
}

function openPopup() {
    $(".popupOverlay, .popupContent").addClass("active");
}

function closePopup() {
    $("#db-name").val("");
    $("#db-description").val("");
    $(".popupOverlay, .popupContent").removeClass("active");
    $(".error-tip").removeClass("active");
    $(".dashboard").removeClass("active");
    $("#selected-dashboard span").html("Choose Dashboard");
    newDashboardBtn.addClass("active");
    existingDashboardBtn.removeClass("active");
    newDashboard.show();
    existingDashboard.hide();
    $("#create-db").show();
    $("#create-panel").hide();
}

//Create panel in a new dashboard
function createPanelToNewDashboard() {
    var inputdbname = $("#db-name").val();
    var inputdbdescription = $("#db-description").val();
    var timeRange = data.startEpoch;
    var refresh = "";

    if (!inputdbname) {
        $(".error-tip").addClass("active");
    } else {
        $("#save-dbbtn").off("click");
        $(document).off("keypress");

        $.ajax({
            method: "post",
            url: "api/dashboards/create",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Accept: "*/*",
            },
            data: JSON.stringify(inputdbname),
            dataType: "json",
            crossDomain: true,
        }).then(function (res) {
            $("#db-name").val("");
            $("#db-description").val("");
            $(".error-tip").removeClass("active");
            $(".popupOverlay, .popupContent").removeClass("active");
            let panelCreatedFromLogs = createPanel(0);
            var dashboard = {
                id: Object.keys(res)[0],
                name: Object.values(res)[0],
                details: {
                    name: Object.values(res)[0],
                    description: inputdbdescription,
                    timeRange: timeRange,
                    refresh: refresh,
                    panels: [panelCreatedFromLogs],
                },
            };
            updateDashboard(dashboard);
            var queryString = "?id=" + Object.keys(res)[0];
            window.location.href = "../dashboard.html" + queryString;
        }).catch(function (updateError) {
            if (updateError.status === 409) {
                $('.error-tip').text('Dashboard name already exists!');
                $('.error-tip').addClass('active');
            }
        });
    }
}

$("#create-db").click(function () {
    if (newDashboardFlag) createPanelToNewDashboard();
});

const existingDashboards = [];

// Display list of existing dashboards
function displayExistingDashboards() {
    $.ajax({
        method: "get",
        url: "api/dashboards/listall",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Accept: "*/*",
        },
        crossDomain: true,
        dataType: "json",
    }).then(function (res) {
        if (res) {
            let dropdown = $("#dashboard-options");
            // Filtering default dashboards
            let defaultDashboardIds = [
                "10329b95-47a8-48df-8b1d-0a0a01ec6c42",
                "a28f485c-4747-4024-bb6b-d230f101f852",
                "bd74f11e-26c8-4827-bf65-c0b464e1f2a4",
                "53cb3dde-fd78-4253-808c-18e4077ef0f1"
            ];
            let additionalDashboards = Object.keys(res).filter(id => !defaultDashboardIds.includes(id) && !existingDashboards.includes(id));
            if (additionalDashboards.length === 0 && existingDashboards.length === 0) {
                // Add empty list item when there are no additional dashboards
                dropdown.html(`<li class="dashboard"></li>`);
            } else {
                $.each(res, function (id, dashboardName) {
                    // exclude default dashboards
                    if (!defaultDashboardIds.includes(id) && !existingDashboards.includes(id)) {
                        dropdown.append(`<li class="dashboard" id="${id}">${dashboardName}</li>`);
                        existingDashboards.push(id);
                    }
                });
                dropdown.off("click", ".dashboard");
                dropdown.on("click", ".dashboard", selectDashboardHandler);
            }
        }
    });
}

// Select a existing dashboard
function selectDashboardHandler() {
    let selectedOption = $(this).html();
    $(".dashboard").removeClass("active");
    $("#selected-dashboard span").html(selectedOption);
    $(this).addClass("active");
    dashboardID = $(this).attr("id");
    let dashboard;

    // Get the selected dashboard details
    function createPanelToExistingDashboard() {
        $.ajax({
            method: "get",
            url: "api/dashboards/" + dashboardID,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Accept: "*/*",
            },
            crossDomain: true,
            dataType: "json",
        }).then(function (res) {
            let dashboardDetails = res;
            if (!dashboardDetails.panels) {
                // If there is no existing Panel
                dashboardDetails.panels = [];
            }
            let panelCreatedFromLogs = createPanel(
                dashboardDetails.panels.length,
                dashboardDetails.panels[0]?.queryData?.startEpoch,
            );

            dashboardDetails = handlePanelPosition(
                dashboardDetails,
                panelCreatedFromLogs,
            );
            dashboard = {
                id: dashboardID,
                name: selectedOption,
                details: dashboardDetails,
            };
            updateDashboard(dashboard);
            var queryString = "?id=" + dashboardID;
            window.location.href = "../dashboard.html" + queryString;
        });
    }

    $("#create-panel").click(function () {
        if (!newDashboardFlag) createPanelToExistingDashboard();
    });
}

function handlePanelPosition(existingDashboard, newPanel) {
    const maxY = existingDashboard.panels.reduce((max, panel) => {
        return Math.max(max, panel.gridpos.y + panel.gridpos.h);
    }, 0);
    newPanel.gridpos.y = maxY + 20;
    existingDashboard.panels.push(newPanel);
    return existingDashboard;
}

function updateDashboard(dashboard) {
    $.ajax({
        method: "post",
        url: "api/dashboards/update",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Accept: "*/*",
        },
        data: JSON.stringify(dashboard),
        dataType: "json",
        crossDomain: true,
    }).then(function (msg) {
        console.log("done:", msg);
    });
}

function createPanel(panelIndex, startEpoch) {
    let panelId = uuidv4();

    let panel = {
        chartType: "Data Table",
        dataType: "",
        description: "",
        gridpos: {
            h: 250,
            w: 653,
            wPercent: 0.49733434881949734,
            x: 10,
            y: 20,
        },
        logLinesViewType: "Table view",
        name: "New-Panel",
        panelId: panelId,
        panelIndex: panelIndex,
        queryData: {
            endEpoch: data.endEpoch,
            from: 0,
            indexName: data.indexName,
            queryLanguage: data.queryLanguage,
            searchText: data.searchText,
            startEpoch: startEpoch ? startEpoch : data.startEpoch,
            state: data.state,
        },
        queryType: "logs",
        unit: "",
    };
    return panel;
}

// When the 'alert-from-logs-btn' button is clicked
$('#alert-from-logs-btn').click(function () {
    // Remove any existing modal with the same ID
    $('#createAlertModal').remove();

    

    // Create the HTML string for the modal
    var modalHtml = `
        <div class="modal fade" id="createAlertModal" tabindex="-1" role="dialog" aria-labelledby="createAlertModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="createAlertModalLabel">Create Alert</h5>
                    </div>
                    <div class="modal-body">
                        <form id="alert-form">
                            <div class="form-group">
                                <label for="alert-rule-name">Enter alert rule name</label>
                                <input type="text" class="form-control" id="alert-rule-name-modal" placeholder="Name" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="create-alert">Create</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append the modal HTML to the body
    $('body').append(modalHtml);

    // Show the modal
    $('#createAlertModal').modal('show');

    // Event handler for the "Create" button inside the modal
    $('#create-alert').click(function () {
        // Retrieve the rule name entered by the user
        var ruleName = $('#alert-rule-name-modal').val().trim();

        if (ruleName) {
            // Set the rule name to an input field elsewhere on the page
            $('#alert-rule-name').val(ruleName);

            // Assuming you want to redirect to a new page, passing the rule name as a query parameter
            window.location.href = "../alert.html?ruleName=" + encodeURIComponent(ruleName);

            // Close the modal
            $('#createAlertModal').modal('hide');
        } else {
            // Alert the user if the rule name field is empty
            alert('Please enter a rule name.');
        }
    });

    // When the modal is closed, remove it from the DOM to prevent residue
    $('#createAlertModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });

    // Manually handle the closing of the modal with jQuery
    $(document).on('click', '.btn-secondary', function () {
        $('#createAlertModal').modal('hide');
    });
});

