var GAMESTATE = 0;
//0 = LOAD
//05 = GAME MODE
//10 = TUTORIAL
//20 = GAME
//30 = RUN HACK
//40 = SUCCESS
//50 = FAIL
var STARTBEAM = false;
var gameCanvas = document.getElementById("gameCanvas");
var FAILSTATE = false;
var failReason = 0;
//0 = Timer
//1 = Wall
//2 = Alarm

var GAMEMODE = 0;
//0 = timed
//1 = Chase

// the start and ending images
var startIMG = new Image();
startIMG.src = "img/start.png"
var endIMG = new Image();
endIMG.src = "img/end.png"
var runHackIMG = new Image();
runHackIMG.src = "img/runHack.png"

// the menu image and vars
var menuIMG = new Image();
menuIMG.src = "img/menu.png"

var nodes = [];
// node[0][0]=piece type
// node[0][1]=piece rotation
// node[0][2]=xpos
// node[0][3]=ypos
// node[0][99]=on/off
var nodeCount = 16;
var nodeVarCount = 8;
var colCount = 4;
var rowCount = 4;
var puzzle = [
    [2, 3],
    [2, 2],
    [0, 1],
    [2, 2],
    [1, 0],
    [6, 0],
    [2, 0],
    [6, 0],
    [2, 1],
    [2, 0],
    [0, 3],
    [2, 3],
    [2, 1],
    [2, 1],
    [2, 2],
    [0, 3]
];

// setup the nodes
for (var n = 0; n < nodeCount; n++) {
    nodes[n] = [];
    nodes[n][0] = puzzle[n][0];
    nodes[n][1] = puzzle[n][1];
    nodes[n][98] = 0; //chargeState
    nodes[n][99] = false; //active node
}

// position for the start and end button
var startPos = [0, 375];
var endPos = [450, 75];

// BEAM VARIABLES
var beamWidth = 55; //the starting width for the beam
var beamHeight = 5; //the starting height for the beam
var BEAMCOUNT = 0; //the segment of the beam we're testing
var NODENUM = 0; //our current active node
var NEXTNODE = 0; //the projected next node based on facing
var PREVNODE = 0; //the node we just came from
var xlineStartPos = 0; //updated x position to start the beam
var ylineStartPos = 0; //updated y position to start the beam
var BEAMPOSITIVE = true; //is the beam moving ina  positive or negative direction?
var BEAMDIR = 0; //the direciton the beam should fire. 0-UP, 1-RIGHT, 2-DOWN, 3-LEFT
var beamStore = []; //store the previous bits of beam
var beamStoreSpot = 0; //where we are in the beam
var beamSpeed = 3; //how fast the beam moves
var xbeamEnd = 0; //check the beam end
var ybeamEnd = 0; //check the beam end

//initialize beamStoreSpot
for (bstore = 0; bstore < 100; bstore++) {
    beamStore[bstore] = [];
    beamStore[bstore][0] = 0;
    beamStore[bstore][1] = 0;
    beamStore[bstore][2] = 0;
    beamStore[bstore][3] = 0;
}

var imgStore = [];
var imgCount = 8;

for (var i = 0; i < imgCount; i++) {
    imgStore[i] = new Image();

    if (i == 0) {
        imgStore[i].src = "img/Node/node_0_Square.png";
    } else if (i == 1) {
        imgStore[i].src = "img/Node/node_1_Pass.png";
    } else if (i == 2) {
        imgStore[i].src = "img/Node/node_2_Circle_0.png";
    } else if (i == 3) {
        imgStore[i].src = "img/Node/node_3_Circle_1.png";
    } else if (i == 4) {
        imgStore[i].src = "img/Node/node_4_Circle_2.png";
    } else if (i == 5) {
        imgStore[i].src = "img/Node/node_5_Circle_3.png";
    } else if (i == 6) {
        imgStore[i].src = "img/Node/node_1_Alarm.png";
    } else if (i == 7) {
        imgStore[i].src = "img/Node/node_2_Circle_On.png";
    }
}

var TIMERSTART = false; //start the timer?
var timer = 30; //how long is the timer?

function draw() {
    gameCanvas = document.getElementById("gameCanvas");
    gameCanvas.getContext("2d").clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    if (GAMESTATE == 0) {
        GAMESTATE = 5;
    } else if (GAMESTATE == 5 || GAMESTATE == 10) {
        menuScreen();
    } else if (GAMESTATE == 20 || GAMESTATE == 30) { //INPUT STATE

        if (GAMEMODE == 0) { //TIMED MODE
            //draw the gameboard
            if (STARTBEAM) {
                drawBeamTimed();
            }
        } else if (GAMEMODE == 1) { //CHASE MODE
            //draw the gameboard
            if (STARTBEAM) {
                drawBeamHyper();
            }
        }

        drawGoals();
        drawNodes();
        endStateCheck();

    } else if (GAMESTATE == 40) { //SUCCESS STATE
        menuScreen();
    } else if (GAMESTATE == 50) { //FAIL STATE
        menuScreen();
    }

    if (TIMERSTART) {
        timerDraw();
        TIMERSTART = false;
    }

    //setup the listeners
    //gameCanvas.addEventListener("mouseup", update);
    gameCanvas.addEventListener("mouseup", update);

    //regulate our draw calls
    requestAnimationFrame(draw);
}

///////////////////////////////////////////////////////////////////////////
//FUNCTION: drawGoals()
//
//PURPOSE: Draw the start and end pipe that define the puzzle as well as
//          the Run Hack button
///////////////////////////////////////////////////////////////////////////
function drawGoals() {
    var ctx = gameCanvas.getContext("2d");

    ctx.drawImage(startIMG, startPos[0], startPos[1]);
    ctx.drawImage(endIMG, endPos[0], endPos[1]);

    if (GAMEMODE == 0 && GAMESTATE == 20 || GAMEMODE == 1 && timer >= 0) {
        if (timer >= 10) {
            ctx.fillStyle = "#FFFFFF";
        } else {
            ctx.fillStyle = "#FF0000";
        }
        ctx.font = "50px Arial";
        ctx.fillText(timer, 410, 70);

        if (!STARTBEAM && GAMEMODE == 0) {
            ctx.drawImage(runHackIMG, gameCanvas.width / 3.5, 410, 125, 125);
        }

        ctx.fillStyle = "#000000";
    }
}

///////////////////////////////////////////////////////////////////////////
//FUNCTION: drawNodes()
//
//PURPOSE: Our update function to redraw the appropriate nodes every frame
///////////////////////////////////////////////////////////////////////////
function drawNodes() {
    var ctx = gameCanvas.getContext("2d");

    var xPos = 75;
    var yPos = 75;
    var tRowCount = 0;
    var tempImage = new Image();
    tempImage.src = imgStore[2].src;

    // Draw out all of the nodes
    for (var nodeDraw = 0; nodeDraw < nodeCount; nodeDraw++) {

        var image = nodes[nodeDraw][0];

        if (image == 1 || image == 6) {
            ctx.drawImage(imgStore[image], xPos, yPos);
        } else if (image == 0 || image == 2) {
            if (nodes[nodeDraw][1] == 0) {

                if (nodes[nodeDraw][99] == false || nodes[nodeDraw] == 0) {
                    if (nodes[nodeDraw][98] == 5) {
                        ctx.drawImage(imgStore[5], xPos, yPos);
                    } else {
                        ctx.drawImage(imgStore[image], xPos, yPos);
                    }

                } else if (nodes[nodeDraw][99] == true) {
                    if (nodes[nodeDraw][98] == 0) {
                        ctx.drawImage(imgStore[7], xPos, yPos);
                    } else if (nodes[nodeDraw][98] == 3) {
                        ctx.drawImage(imgStore[3], xPos, yPos);
                    } else if (nodes[nodeDraw][98] == 4) {
                        ctx.drawImage(imgStore[4], xPos, yPos);
                    } else if (nodes[nodeDraw][98] == 5) {
                        ctx.drawImage(imgStore[5], xPos, yPos);
                    }
                }

            } else if (nodes[nodeDraw][1] == 1) {
                ctx.save();
                ctx.translate(xPos + 50, yPos);
                ctx.rotate(90 * Math.PI / 180);

                if (nodes[nodeDraw][99] == false || nodes[nodeDraw] == 0) {

                    if (nodes[nodeDraw][99] == false || nodes[nodeDraw] == 0) {
                        if (nodes[nodeDraw][98] == 5) {
                            ctx.drawImage(imgStore[5], 0, 0);
                        } else {
                            ctx.drawImage(imgStore[image], 0, 0);
                        }
                    }

                } else if (nodes[nodeDraw][99] == true) {
                    if (nodes[nodeDraw][98] == 3) {
                        ctx.drawImage(imgStore[3], 0, 0);
                    } else if (nodes[nodeDraw][98] == 4) {
                        ctx.drawImage(imgStore[4], 0, 0);
                    } else if (nodes[nodeDraw][98] == 5) {
                        ctx.drawImage(imgStore[5], 0, 0);
                    } else {
                        ctx.drawImage(imgStore[7], 0, 0);
                    }
                }

                ctx.restore();
            } else if (nodes[nodeDraw][1] == 2) {
                ctx.save();
                ctx.translate(xPos + 50, yPos + 50);
                ctx.rotate(180 * Math.PI / 180);

                if (nodes[nodeDraw][99] == false || nodes[nodeDraw] == 0) {
                    if (nodes[nodeDraw][99] == false || nodes[nodeDraw] == 0) {
                        if (nodes[nodeDraw][98] == 5) {
                            ctx.drawImage(imgStore[5], 0, 0);
                        } else {
                            ctx.drawImage(imgStore[image], 0, 0);
                        }
                    }
                } else if (nodes[nodeDraw][99] == true) {
                    if (nodes[nodeDraw][98] == 3) {
                        ctx.drawImage(imgStore[3], 0, 0);
                    } else if (nodes[nodeDraw][98] == 4) {
                        ctx.drawImage(imgStore[4], 0, 0);
                    } else if (nodes[nodeDraw][98] == 5) {
                        ctx.drawImage(imgStore[5], 0, 0);
                    } else {
                        ctx.drawImage(imgStore[7], 0, 0);
                    }
                }

                ctx.restore();
            } else if (nodes[nodeDraw][1] == 3) {
                ctx.save();
                ctx.translate(xPos, yPos + 50);
                ctx.rotate(270 * Math.PI / 180);

                if (nodes[nodeDraw][99] == false || nodes[nodeDraw] == 0) {
                    if (nodes[nodeDraw][99] == false || nodes[nodeDraw] == 0) {
                        if (nodes[nodeDraw][98] == 5) {
                            ctx.drawImage(imgStore[5], 0, 0);
                        } else {
                            ctx.drawImage(imgStore[image], 0, 0);
                        }
                    }
                } else if (nodes[nodeDraw][99] == true) {
                    if (nodes[nodeDraw][98] == 0) {
                        ctx.drawImage(imgStore[7], 0, 0);
                    } else if (nodes[nodeDraw][98] == 3) {
                        ctx.drawImage(imgStore[3], 0, 0);
                    } else if (nodes[nodeDraw][98] == 4) {
                        ctx.drawImage(imgStore[4], 0, 0);
                    } else if (nodes[nodeDraw][98] == 5) {
                        ctx.drawImage(imgStore[5], 0, 0);
                    }
                }

                ctx.restore();
            }
        }

        //store the nodes location in the array
        nodes[nodeDraw][2] = xPos + 26;
        nodes[nodeDraw][3] = yPos + 27;

        //move each block a short distance away
        xPos += 100;
        tRowCount++;

        // account for how many rows we have
        if (tRowCount == rowCount) {
            xPos = 75;
            yPos += 100;
            tRowCount = 0;
        }


    }
}

///////////////////////////////////////////////////////////////////////////
//FUNCTION: drawBeam()
//
//PURPOSE: When the player starts the hack, run the beam through their 
//         puzzle to see if their solution is correct
///////////////////////////////////////////////////////////////////////////
function drawBeamTimed() {
    var ctx = gameCanvas.getContext("2d");

    /////////////////
    // DID WE WIN? //
    /////////////////
    if (NODENUM == 3 && BEAMDIR == 1 && beamWidth > 60) {
        //alert("YOU WIN!");
        //player won!
        GAMESTATE = 40;
    }

    //////////////////
    // DID WE LOSE? //
    //////////////////

    if (GAMESTATE == 30 && BEAMCOUNT == 1) {
        // went too high!
        if (BEAMDIR == 0 && (NODENUM == 0 || NODENUM == 1 || NODENUM == 2 || NODENUM == 3) && beamWidth < -70) {
            //you failed
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 1; //hit a wall
            //too far right
        } else if (BEAMDIR == 1 && (NODENUM == 7 || NODENUM == 11 || NODENUM == 15) && beamWidth > 70) {
            //you failed
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 1; //hit a wall
            //too far down
        } else if (BEAMDIR == 2 && (NODENUM == 12 || NODENUM == 13 || NODENUM == 14 || NODENUM == 15) && beamWidth > 70) {
            //you failed
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 1; //hit a wall
            //too far left
        } else if (BEAMDIR == 3 && (NODENUM == 0 || NODENUM == 4 || NODENUM == 8 || NODENUM == 12) && beamWidth < -70) {
            //you failed
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 1; //hit a wall
        }
    }
    ////////////////
    // FIRST NODE //
    //keep the beam moving
    if (BEAMCOUNT == 0) {
        if (beamWidth < 100) {
            NODENUM = 0;
            NEXTNODE = 12;
            drawLine(startPos[0], startPos[1] + 27, beamWidth, startPos[1] + 27);
            beamWidth += beamSpeed;
        } else {
            xlineStartPos = beamWidth;
            ylineStartPos = startPos[1] + 26;
            beamWidth = 1;
            PREVNODE = NODENUM;
            NODENUM = NEXTNODE;
            BEAMCOUNT = 1;

            //start storing the beam to draw all the time
            beamStore[0][0] = startPos[0];
            beamStore[0][1] = startPos[1] + 26;
            beamStore[0][2] = nodes[NODENUM][2];
            beamStore[0][3] = nodes[NODENUM][3] + 1;

            beamStoreSpot++;
        }
    } else if (BEAMCOUNT == 1) {

        // IF ITS AN ALARM NODE
        if (nodes[NODENUM][0] == 6) {
            // we failed, oh no!
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 2; //hit a wall
            //IF ITS A SQUARE NODE
        } else if (nodes[NODENUM][0] == 0) {

            // SQUARE NODE FAIL CHECK
            if (nodes[NODENUM][1] == 0) { //L SQUARE
                if (PREVNODE == NODENUM + 1) {
                    BEAMPOSITIVE = false;
                    BEAMDIR = 0; //beam shoots up
                } else if (PREVNODE == NODENUM - 4) {
                    BEAMPOSITIVE = true;
                    BEAMDIR = 1; //beam shoots right
                } else {
                    // we failed, oh no!
                    FAILSTATE = true;
                    GAMESTATE = 50;
                    failReason = 1; //hit a wall
                }

            } else if (nodes[NODENUM][1] == 1) { //r SQUARE
                if (PREVNODE == NODENUM + 1) {
                    BEAMPOSITIVE = true;
                    BEAMDIR = 2; //beam shoots down
                } else if (PREVNODE == NODENUM + 4) {
                    BEAMPOSITIVE = true;
                    BEAMDIR = 1; //beam shoots right
                } else {
                    // we failed, oh no!
                    FAILSTATE = true;
                    GAMESTATE = 50;
                    failReason = 1; //hit a wall
                }
            } else if (nodes[NODENUM][1] == 2) { //7 SQUARE
                if (PREVNODE == NODENUM - 1) {
                    BEAMPOSITIVE = true;
                    BEAMDIR = 2; //beam shoots down
                } else if (PREVNODE == NODENUM + 4) {
                    BEAMPOSITIVE = false;
                    BEAMDIR = 3; //beam shoots left
                } else {
                    // we failed, oh no!
                    FAILSTATE = true;
                    GAMESTATE = 50;
                    failReason = 1; //hit a wall
                }

            } else if (nodes[NODENUM][1] == 3) { //U SQUARE
                if (PREVNODE == NODENUM - 1) {
                    BEAMPOSITIVE = false;
                    BEAMDIR = 0; //beam shoots up
                } else if (PREVNODE == NODENUM - 4) {
                    BEAMPOSITIVE = false;
                    BEAMDIR = 3; //beam shoots left
                } else {
                    // we failed, oh no!
                    FAILSTATE = true;
                    GAMESTATE = 50;
                    failReason = 1; //hit a wall
                }
            }
        } else if (nodes[NODENUM][0] == 1) { //ITS Pass Node
            if (PREVNODE == NODENUM - 4) {
                BEAMPOSITIVE = true;
                BEAMDIR = 2;
            } else if (PREVNODE == NODENUM + 4) {
                BEAMPOSITIVE = false;
                BEAMDIR = 0;
            } else {
                // we failed, oh no!
                FAILSTATE = true;
                GAMESTATE = 50;
                failReason = 1; //hit a wall
            }
        } else if (nodes[NODENUM][0] == 2) { //ITS A CIRCLE NODE

            //is the beam heading in a positive or negative direction?
            if (nodes[NODENUM][1] == 1 || nodes[NODENUM][1] == 2) {
                BEAMPOSITIVE = true;
            } else {
                BEAMPOSITIVE = false;
            }

            if (nodes[NODENUM][1] == 0) {
                BEAMDIR = 0; //beam up
                NEXTNODE = NODENUM - 4;
            } else if (nodes[NODENUM][1] == 1) {
                BEAMDIR = 1; //beam right
                NEXTNODE = NODENUM + 1;
            } else if (nodes[NODENUM][1] == 2) {
                BEAMDIR = 2; //beam down
                NEXTNODE = NODENUM + 4;
            } else if (nodes[NODENUM][1] == 3) {
                BEAMDIR = 3; //beam left
                NEXTNODE = NODENUM - 1;
            }
        }
    }

    //////////////////////////
    // DRAW THE BEAM ITSELF //
    //////////////////////////
    if (BEAMCOUNT != 0) {
        if (BEAMCOUNT == 1 && BEAMPOSITIVE && beamWidth < 100) {
            //BEAM RIGHT
            if (BEAMDIR == 1) {
                drawLine(nodes[NODENUM][2], nodes[NODENUM][3], nodes[NODENUM][2] + beamWidth, nodes[NODENUM][3]);
                beamWidth += beamSpeed;
                NEXTNODE = NODENUM + 1;

                //BEAM DOWN
            } else if (BEAMDIR == 2) {
                drawLine(nodes[NODENUM][2], nodes[NODENUM][3], nodes[NODENUM][2], nodes[NODENUM][3] + beamWidth);
                beamWidth += beamSpeed;
                NEXTNODE = NODENUM + 4;

            }
        } else if (!BEAMPOSITIVE && beamWidth > -100) {
            //BEAM UP
            if (BEAMDIR == 0) {
                drawLine(nodes[NODENUM][2], nodes[NODENUM][3], nodes[NODENUM][2], nodes[NODENUM][3] + beamWidth);
                beamWidth -= beamSpeed;
                NEXTNODE = NODENUM - 4;

                //BEAM LEFT
            } else if (BEAMDIR == 3) {
                drawLine(nodes[NODENUM][2], nodes[NODENUM][3], nodes[NODENUM][2] + beamWidth, nodes[NODENUM][3]);
                beamWidth -= beamSpeed;
                NEXTNODE = NODENUM - 1;
            }

        } else {
            //lets try drawing the beam forever
            beamStore[beamStoreSpot][0] = nodes[NODENUM][2];
            beamStore[beamStoreSpot][1] = nodes[NODENUM][3];
            beamStore[beamStoreSpot][2] = nodes[NEXTNODE][2];
            beamStore[beamStoreSpot][3] = nodes[NEXTNODE][3];

            //set the node we're about to be on 
            PREVNODE = NODENUM;
            NODENUM = NEXTNODE;

            //reset the beamWidth
            beamWidth = 1;
            beamStoreSpot++;
        }
    }

    //draw previous chunks of the beam
    for (var b = 0; b < beamStoreSpot; b++) {
        drawLine(beamStore[b][0], beamStore[b][1], beamStore[b][2], beamStore[b][3]);
        //alert(beamStore[beamStoreSpot][0]);
        //alert(beamStore[b][0] + " " + beamStore[b][1] + " " + beamStore[b][2] + " " + beamStore[b][3]);
    }
}

///////////////////////////////////////////////////////////////////////////
// FUNCTION: drawLine(sx, sy, ex, ey)
//
// sx: starting x point
// sy: starting y point
// ex: ending x point
// ey: ending y point
//
// PURPOSE: Takes in 4 points and draws a line from the start to the end
///////////////////////////////////////////////////////////////////////////
function drawLine(sx, sy, ex, ey) {
    var ctx = gameCanvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.strokeStyle = "#05fdfd";
    ctx.lineWidth = beamHeight;
    ctx.lineTo(ex, ey);
    ctx.stroke();
}

///////////////////////////////////////////////////////////////////////////
// FUNCTION: update(mouseEvent)
//
// PURPOSE: update runs every frame, it takes the mouse click and checks to
//          see if we've clicked on a node. If we have clicked on a node and
//          its a circle, incrment its count so it will rotate next redraw
///////////////////////////////////////////////////////////////////////////
function update(mouseEvent) {

    //0 = LOAD
    //10 = TUTORIAL
    //20 = GAME
    //30 = RUN HACK
    //40 = SUCCESS
    //50 = FAIL

    if (GAMESTATE == 0) {

    } else if (GAMESTATE == 5) { //CHOOSE GAME MODE
        if (mouseEvent.offsetX > 135 && mouseEvent.offsetX < 240 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 400) {
            GAMEMODE = 0; //TIMER MODE
            beamSpeed = 3;
            timer = 30;
        } else if (mouseEvent.offsetX > 260 && mouseEvent.offsetX < 360 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 400) {
            GAMEMODE = 1; //HYPER MODE
            beamSpeed = 3;
            timer = 5;
        }

        GAMESTATE = 10;
    } else if (GAMESTATE == 10) { //TUTORIAL SCREEN
        if (mouseEvent.offsetX > 135 && mouseEvent.offsetX < 240 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 400) {
            if (GAMEMODE == 0) {
                GAMESTATE = 20; //TIMED MODE
            } else if (GAMEMODE == 1) {
                GAMESTATE = 30; //HYPER MODE
            }

            //either way, start the timer
            TIMERSTART = true;
        } else if (mouseEvent.offsetX > 260 && mouseEvent.offsetX < 360 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 400) {
            alert("RIGHT BUTTON");
        }
    } else if ((GAMESTATE == 20 && GAMEMODE == 0) || (GAMESTATE == 30 && GAMEMODE == 1)) { //GAME PLANNING
        ////////////////////
        // RUN HACK
        if (mouseEvent.offsetX > 125 && mouseEvent.offsetX < 275 && mouseEvent.offsetY > 430 && mouseEvent.offsetY < 495) {
            STARTBEAM = true;
            GAMESTATE = 30;
        }

        ////////////////////
        // NODE COLLISION 
        // ROW 1
        if ((GAMESTATE == 20 && GAMEMODE == 0) || GAMEMODE == 1) {
            if (mouseEvent.offsetX > 75 && mouseEvent.offsetX < 125 && mouseEvent.offsetY > 70 && mouseEvent.offsetY < 125) {
                if (nodes[0][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) { // && nodes[0][99] == true
                    if (nodes[0][1] == 3) {
                        nodes[0][1] = 0
                    } else {
                        nodes[0][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 175 && mouseEvent.offsetX < 225 && mouseEvent.offsetY > 70 && mouseEvent.offsetY < 125) {
                if (nodes[1][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[1][1] == 3) {
                        nodes[1][1] = 0
                    } else {
                        nodes[1][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 275 && mouseEvent.offsetX < 325 && mouseEvent.offsetY > 70 && mouseEvent.offsetY < 125) {
                if (nodes[2][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[2][1] == 3) {
                        nodes[2][1] = 0
                    } else {
                        nodes[2][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 375 && mouseEvent.offsetX < 425 && mouseEvent.offsetY > 70 && mouseEvent.offsetY < 125) {
                if (nodes[3][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[3][1] == 3) {
                        nodes[3][1] = 0
                    } else {
                        nodes[3][1]++;
                    }
                }
                //ROW 2
            } else if (mouseEvent.offsetX > 75 && mouseEvent.offsetX < 125 && mouseEvent.offsetY > 170 && mouseEvent.offsetY < 225) {
                if (nodes[4][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[4][1] == 3) {
                        nodes[4][1] = 0
                    } else {
                        nodes[4][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 175 && mouseEvent.offsetX < 225 && mouseEvent.offsetY > 170 && mouseEvent.offsetY < 225) {
                if (nodes[5][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[5][1] == 3) {
                        nodes[5][1] = 0
                    } else {
                        nodes[5][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 275 && mouseEvent.offsetX < 325 && mouseEvent.offsetY > 170 && mouseEvent.offsetY < 225) {
                if (nodes[6][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[6][1] == 3) {
                        nodes[6][1] = 0
                    } else {
                        nodes[6][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 375 && mouseEvent.offsetX < 425 && mouseEvent.offsetY > 170 && mouseEvent.offsetY < 225) {
                if (nodes[7][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[7][1] == 3) {
                        nodes[7][1] = 0
                    } else {
                        nodes[7][1]++;
                    }
                }
                //ROW 3
            } else if (mouseEvent.offsetX > 75 && mouseEvent.offsetX < 125 && mouseEvent.offsetY > 270 && mouseEvent.offsetY < 325) {
                if (nodes[8][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[8][1] == 3) {
                        nodes[8][1] = 0
                    } else {
                        nodes[8][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 175 && mouseEvent.offsetX < 225 && mouseEvent.offsetY > 270 && mouseEvent.offsetY < 325) {
                if (nodes[9][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[9][1] == 3) {
                        nodes[9][1] = 0
                    } else {
                        nodes[9][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 275 && mouseEvent.offsetX < 325 && mouseEvent.offsetY > 270 && mouseEvent.offsetY < 325) {
                if (nodes[10][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[10][1] == 3) {
                        nodes[10][1] = 0
                    } else {
                        nodes[10][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 375 && mouseEvent.offsetX < 425 && mouseEvent.offsetY > 270 && mouseEvent.offsetY < 325) {
                if (nodes[11][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[11][1] == 3) {
                        nodes[11][1] = 0
                    } else {
                        nodes[11][1]++;
                    }
                }
                //ROW 4
            } else if (mouseEvent.offsetX > 75 && mouseEvent.offsetX < 125 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 425) {
                if (nodes[12][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[12][1] == 3) {
                        nodes[12][1] = 0
                    } else {
                        nodes[12][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 175 && mouseEvent.offsetX < 225 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 425) {
                if (nodes[13][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[13][1] == 3) {
                        nodes[13][1] = 0
                    } else {
                        nodes[13][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 275 && mouseEvent.offsetX < 325 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 425) {
                if (nodes[14][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[14][1] == 3) {
                        nodes[14][1] = 0
                    } else {
                        nodes[14][1]++;
                    }
                }
            } else if (mouseEvent.offsetX > 375 && mouseEvent.offsetX < 425 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 425) {
                if (nodes[15][0] == 2 && (GAMEMODE == 0 || (GAMEMODE == 1))) {
                    if (nodes[15][1] == 3) {
                        nodes[15][1] = 0
                    } else {
                        nodes[15][1]++;
                    }
                }
            }
        }
    } else if (GAMESTATE == 40) { // SUCCESS STATE
        if (mouseEvent.offsetX > 135 && mouseEvent.offsetX < 240 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 400) {
            resetBoard();
        } else if (mouseEvent.offsetX > 260 && mouseEvent.offsetX < 360 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 400) {
            //alert("RIGHT BUTTON");
            close();
        }
    } else if (GAMESTATE == 50) { // FAIL STATE
        if (mouseEvent.offsetX > 135 && mouseEvent.offsetX < 240 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 400) {
            resetBoard();
        } else if (mouseEvent.offsetX > 260 && mouseEvent.offsetX < 360 && mouseEvent.offsetY > 370 && mouseEvent.offsetY < 400) {
            //alert("RIGHT BUTTON");
            close();
        }
    }






}

///////////////////////////////////////////////////////////////////////////
// FUNCTION: menuScreen(mouseEvent)
//
// PURPOSE: Display the menu screen and show a button that when clicked lets
//          the player start over
///////////////////////////////////////////////////////////////////////////
function menuScreen(mouseEvent) {
    var ctx = gameCanvas.getContext("2d");

    ctx.drawImage(menuIMG, 100, 75);
    var xmenuDraw = 0;
    var ymenuDraw = 0;

    //start the main game
    if (GAMESTATE == 5) { // CHOOSE GAME MODE
        //WINDOW TITLE
        ctx.font = "20px Arial";
        ctx.fillText("Game Selection", 180, 96);

        //start game button text
        ctx.font = "15px Arial";
        ctx.fillText("Timed Mode", 151, 392);
        ctx.fillText("Chase Mode", 270, 392);

        //HOW IT WORKS

        ctx.font = "12px Arial";
        ctx.fillText("Timed Mode:", 127, 180);
        ctx.fillText("The timer starts when the game begins. The ", 127, 195);
        ctx.fillText("player has until the timer expires to plan", 127, 210);
        ctx.fillText("the beam's path and run the hack.", 127, 225);

        ctx.font = "12px Arial";
        ctx.fillText("Chase Mode:", 127, 275);
        ctx.fillText("The Beam fires when the game starts. Player ", 127, 290);
        ctx.fillText("must arrange the nodes before the beam hits", 127, 305);
        ctx.fillText("them to lead the beam to the finish.", 127, 320);

    } else if (GAMESTATE == 10) { // TUTORIAL MENU

        xmenuDraw = 130;
        ymenuDraw = 125;

        if (GAMEMODE == 0) {

            for (var tut = 0; tut < 4; tut++) {
                if (tut == 0) {
                    ctx.drawImage(imgStore[2], xmenuDraw, ymenuDraw, 35, 35);
                } else if (tut == 3) {
                    ctx.drawImage(imgStore[6], xmenuDraw, ymenuDraw, 35, 35);
                } else {
                    ctx.drawImage(imgStore[tut - 1], xmenuDraw, ymenuDraw, 35, 35);

                }
                ymenuDraw += 40;
            }

            //WINDOW TITLE
            ctx.font = "20px Arial";
            ctx.fillText("TIMED MODE", 180, 96);


            //THE PIECES
            ctx.font = "15px Arial";
            ctx.fillText("THE PIECES", 130, 120);

            //SHOOTER TUTORIAL
            ctx.font = "10px Arial";
            ctx.fillText("- Click to rotate ", 170, 135);
            ctx.fillText("- Beam exits the barrel", 170, 145);
            ctx.fillText("- Beam can enter any side", 170, 155);

            //PASSTHROUGH TUTORIAL
            ctx.font = "10px Arial";
            ctx.fillText("- 90 Degree Pass Through", 170, 175);
            ctx.fillText("- Beam goes in one side out the other", 170, 185);
            ctx.fillText("- Cannot be rotated ", 170, 195);

            //PASSTHROUGH TUTORIAL
            ctx.font = "10px Arial";
            ctx.fillText("- Straight Pass Through", 170, 215);
            ctx.fillText("- Beam goes in one side out the other", 170, 225);
            ctx.fillText("- Cannot be rotated ", 170, 235);

            //ALARM TUTORIAL
            ctx.font = "10px Arial";
            ctx.fillText("- Instant fail", 170, 265);

            //HOW IT WORKS
            ctx.font = "12px Arial";
            ctx.fillText("Player must navigate the beam from the Start", 127, 300);
            ctx.fillText("to the finish by arranging the circle nodes.", 127, 315);
            ctx.fillText("Running out of time, hitting the outside of", 127, 330);
            ctx.fillText("the board or the flat side of a Pass Through", 127, 345);
            ctx.fillText(" will cause the player to fail.", 127, 360);
        } else if (GAMEMODE == 1) {
            for (var tut = 0; tut < 4; tut++) {
                if (tut == 0) {
                    ctx.drawImage(imgStore[3], xmenuDraw, ymenuDraw, 35, 35);
                } else if (tut == 1) {
                    ctx.drawImage(imgStore[5], xmenuDraw, ymenuDraw, 35, 35);
                } else {
                    ctx.drawImage(imgStore[tut - 2], xmenuDraw, ymenuDraw, 35, 35);

                }
                ymenuDraw += 40;
            }

            //WINDOW TITLE
            ctx.font = "20px Arial";
            ctx.fillText("CHASE MODE", 180, 96);


            //THE PIECES
            ctx.font = "15px Arial";
            ctx.fillText("THE PIECES", 130, 120);

            //SHOOTER TUTORIAL
            ctx.font = "10px Arial";
            ctx.fillText("- Click to rotate", 170, 135);
            ctx.fillText("- Beam will exit the barrel", 170, 145);
            ctx.fillText("- Beam fires when all bars are lit", 170, 155);

            //CHARGED SHOOTER TUTORIAL
            ctx.font = "10px Arial";
            ctx.fillText("- Node is charged and will fire when all", 170, 180);
            ctx.fillText("  three beams are lit up.", 170, 190);

            //PASSTHROUGH TUTORIAL
            ctx.font = "10px Arial";
            ctx.fillText("- 90 Degree Pass Through", 170, 215);
            ctx.fillText("- Beam goes in one side out the other", 170, 225);
            ctx.fillText("- Cannot be rotated ", 170, 235);

            //PASSTHROUGH TUTORIAL
            ctx.font = "10px Arial";
            ctx.fillText("- Straight Pass Through", 170, 255);
            ctx.fillText("- Beam goes in one side out the other", 170, 265);
            ctx.fillText("- Cannot be rotated ", 170, 275);

            //HOW IT WORKS
            ctx.font = "11px Arial";
            ctx.fillText("The Beam starts when the game starts. Player", 127, 300);
            ctx.fillText("arranges the nodes ahead of the beam to", 127, 315);
            ctx.fillText("lead it to the Finish. If the beam hits the", 127, 330);
            ctx.fillText("board edge, the flat side of a Pass Through", 127, 345);
            ctx.fillText("or an Alarm it will cause the player to fail.", 127, 360);
        }

        //start game button text
        ctx.font = "15px Arial";
        ctx.fillText("Start Game", 153, 392);


    } else if (GAMESTATE == 40) { //SUCCESS SCREEN
        ctx.font = "30px Arial";
        ctx.fillText("A Winner Is You!", 137, 200);
        ctx.font = "20px Arial";
        ctx.fillText("Play again?", 200, 240);

        //retry game button text
        ctx.font = "15px Arial";
        ctx.fillText("Retry Game", 150, 392);
        ctx.fillText("Quit Game", 275, 392);
    } else if (GAMESTATE == 50) { //PLAYER HAS FAILED!

        ctx.font = "35px Arial";

        if (failReason == 0) {
            ctx.fillText("Time Ran Out!", 135, 200);
        } else if (failReason == 1) {
            ctx.fillText("Hit A Wall!", 170, 200);
        } else if (failReason == 2) {
            ctx.fillText("Alarm tripped!", 135, 200);
        }

        ctx.font = "20px Arial";
        ctx.fillText("Try again?", 200, 240);

        //retry game button text
        ctx.font = "15px Arial";
        ctx.fillText("Retry Game", 150, 392);
        ctx.fillText("Quit Game", 275, 392);
    }
}

///////////////////////////////////////////////////////
// FUNCTION: resetBoard
//
// PURPOSE: Resets the board to the starting position
///////////////////////////////////////////////////////
function resetBoard() {

    //reset the nodes to their starting points
    for (var n = 0; n < nodeCount; n++) {
        nodes[n] = [];
        nodes[n][0] = puzzle[n][0];
        nodes[n][1] = puzzle[n][1];
        nodes[n][99] = false;
    }

    //erase the old beam
    for (bstore = 0; bstore < 100; bstore++) {
        beamStore[bstore] = [];
        beamStore[bstore][0] = 0;
        beamStore[bstore][1] = 0;
        beamStore[bstore][2] = 0;
        beamStore[bstore][3] = 0;
    }

    //restart vars
    STARTBEAM = false;
    FAILSTATE = false;
    BEAMCOUNT = 0; //the segment of the beam we're testing
    NODENUM = 0; //our current active node
    NEXTNODE = 0; //the projected next node based on facing
    PREVNODE = 0; //the node we just came from
    xlineStartPos = 0; //updated x position to start the beam
    ylineStartPos = 0; //updated y position to start the beam

    // set time depending on which game mode we're in
    if (GAMEMODE == 0) {
        timer = 30;
        GAMESTATE = 20;
    } else if (GAMEMODE == 1) {
        timer = 5;
        GAMESTATE = 30;
    }
}

///////////////////////////////////////////////////////////////////
// FUNCTION: timerDraw
//
// PURPOSE: calculate the time remaining and draw it on the board
///////////////////////////////////////////////////////////////////
function timerDraw() {
    setInterval(function() {
        timer--;
        if (timer == 0 && GAMESTATE == 20 && GAMEMODE == 0) {
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 0; //out of time!
        } else if (timer == 0 && GAMEMODE == 1) {
            STARTBEAM = true;
        }
    }, 1000);
}

function nodeChargeTimer(cState) {
    var chargeTimer = 3;
    nodes[cState][98] = 3;
    setInterval(function() {
        chargeTimer--;
        if (chargeTimer > 3) {
            nodes[cState][98] = 3;
        } else if (chargeTimer <= 2 && chargeTimer > 0) {
            nodes[cState][98] = 4;
        } else if (chargeTimer == 0) {
            nodes[cState][98] = 5;
            STARTBEAM = true;
            BEAMCOUNT = 1;
            nodes[cState][99] = false;
        }
    }, 1000);
}

///////////////////////////////////////////////////////////////////////////
//FUNCTION: drawBeam()
//
//PURPOSE: When the player starts the hack, run the beam through their 
//         puzzle to see if their solution is correct
///////////////////////////////////////////////////////////////////////////
function drawBeamHyper() {
    var ctx = gameCanvas.getContext("2d");

    ////////////////
    // FIRST NODE //
    ////////////////
    //keep the beam moving
    if (BEAMCOUNT == 0) {
        if (beamWidth < 100) {
            NODENUM = 0;
            NEXTNODE = 12;
            drawLine(startPos[0], startPos[1] + 27, beamWidth, startPos[1] + 27);
            beamWidth += beamSpeed;
        } else {
            xlineStartPos = beamWidth;
            ylineStartPos = startPos[1] + 26;
            beamWidth = 1;
            PREVNODE = NODENUM;
            NODENUM = NEXTNODE;
            BEAMCOUNT = 9; //pause everything while we count

            //start storing the beam to draw all the time
            beamStore[0][0] = startPos[0];
            beamStore[0][1] = startPos[1] + 26;
            beamStore[0][2] = nodes[NODENUM][2];
            beamStore[0][3] = nodes[NODENUM][3] + 1;

            beamStoreSpot = 1;
            nodes[12][99] = true;

            //start the timer for the next one!
            nodeChargeTimer(12);
        }
    } else if (BEAMCOUNT == 1) {

        // IF ITS AN ALARM NODE
        if (nodes[NODENUM][0] == 6) {
            // we failed, oh no!
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 2; //hit a wall
            //IF ITS A SQUARE NODE
        } else if (nodes[NODENUM][0] == 0) {

            // SQUARE NODE FAIL CHECK
            if (nodes[NODENUM][1] == 0) { //L SQUARE
                if (PREVNODE == NODENUM + 1) {
                    BEAMPOSITIVE = false;
                    BEAMDIR = 0; //beam shoots up
                } else if (PREVNODE == NODENUM - 4) {
                    BEAMPOSITIVE = true;
                    BEAMDIR = 1; //beam shoots right
                } else {
                    // we failed, oh no!
                    FAILSTATE = true;
                    GAMESTATE = 50;
                    failReason = 1; //hit a wall
                }

            } else if (nodes[NODENUM][1] == 1) { //r SQUARE
                if (PREVNODE == NODENUM + 1) {
                    BEAMPOSITIVE = true;
                    BEAMDIR = 2; //beam shoots down
                } else if (PREVNODE == NODENUM + 4) {
                    BEAMPOSITIVE = true;
                    BEAMDIR = 1; //beam shoots right
                } else {
                    // we failed, oh no!
                    FAILSTATE = true;
                    GAMESTATE = 50;
                    failReason = 1; //hit a wall
                }
            } else if (nodes[NODENUM][1] == 2) { //7 SQUARE
                if (PREVNODE == NODENUM - 1) {
                    BEAMPOSITIVE = true;
                    BEAMDIR = 2; //beam shoots down
                } else if (PREVNODE == NODENUM + 4) {
                    BEAMPOSITIVE = false;
                    BEAMDIR = 3; //beam shoots left
                } else {
                    // we failed, oh no!
                    FAILSTATE = true;
                    GAMESTATE = 50;
                    failReason = 1; //hit a wall
                }

            } else if (nodes[NODENUM][1] == 3) { //U SQUARE
                if (PREVNODE == NODENUM - 1) {
                    BEAMPOSITIVE = false;
                    BEAMDIR = 0; //beam shoots up
                } else if (PREVNODE == NODENUM - 4) {
                    BEAMPOSITIVE = false;
                    BEAMDIR = 3; //beam shoots left
                } else {
                    // we failed, oh no!
                    FAILSTATE = true;
                    GAMESTATE = 50;
                    failReason = 1; //hit a wall
                }
            }
        } else if (nodes[NODENUM][0] == 1) { //ITS Pass Node
            if (PREVNODE == NODENUM - 4) {
                BEAMPOSITIVE = true;
                BEAMDIR = 2;
            } else if (PREVNODE == NODENUM + 4) {
                BEAMPOSITIVE = false;
                BEAMDIR = 0;
            } else {
                // we failed, oh no!
                FAILSTATE = true;
                GAMESTATE = 50;
                failReason = 1; //hit a wall
            }
        } else if (nodes[NODENUM][0] == 2) { //ITS A CIRCLE NODE

            //is the beam heading in a positive or negative direction?
            if (nodes[NODENUM][1] == 1 || nodes[NODENUM][1] == 2) {
                BEAMPOSITIVE = true;
            } else {
                BEAMPOSITIVE = false;
            }

            if (nodes[NODENUM][1] == 0) {
                BEAMDIR = 0; //beam up
                NEXTNODE = NODENUM - 4;
            } else if (nodes[NODENUM][1] == 1) {
                BEAMDIR = 1; //beam right
                NEXTNODE = NODENUM + 1;
            } else if (nodes[NODENUM][1] == 2) {
                BEAMDIR = 2; //beam down
                NEXTNODE = NODENUM + 4;
            } else if (nodes[NODENUM][1] == 3) {
                BEAMDIR = 3; //beam left
                NEXTNODE = NODENUM - 1;
            }
        }
    }

    //////////////////////////
    // DRAW THE BEAM ITSELF //
    //////////////////////////
    if (BEAMCOUNT != 0 && BEAMCOUNT != 9) {
        if (BEAMCOUNT == 1 && BEAMPOSITIVE && beamWidth < 100) {
            //BEAM RIGHT
            if (BEAMDIR == 1) {
                drawLine(nodes[NODENUM][2], nodes[NODENUM][3], nodes[NODENUM][2] + beamWidth, nodes[NODENUM][3]);
                beamWidth += beamSpeed;
                NEXTNODE = NODENUM + 1;

                //BEAM DOWN
            } else if (BEAMDIR == 2) {
                drawLine(nodes[NODENUM][2], nodes[NODENUM][3], nodes[NODENUM][2], nodes[NODENUM][3] + beamWidth);
                beamWidth += beamSpeed;
                NEXTNODE = NODENUM + 4;

            }
        } else if (!BEAMPOSITIVE && beamWidth > -100) {
            //BEAM UP
            if (BEAMDIR == 0) {
                drawLine(nodes[NODENUM][2], nodes[NODENUM][3], nodes[NODENUM][2], nodes[NODENUM][3] + beamWidth);
                beamWidth -= beamSpeed;
                NEXTNODE = NODENUM - 4;

                //BEAM LEFT
            } else if (BEAMDIR == 3) {
                drawLine(nodes[NODENUM][2], nodes[NODENUM][3], nodes[NODENUM][2] + beamWidth, nodes[NODENUM][3]);
                beamWidth -= beamSpeed;
                NEXTNODE = NODENUM - 1;
            }

        } else {
            //lets try drawing the beam forever
            beamStore[beamStoreSpot][0] = nodes[NODENUM][2];
            beamStore[beamStoreSpot][1] = nodes[NODENUM][3];
            beamStore[beamStoreSpot][2] = nodes[NEXTNODE][2];
            beamStore[beamStoreSpot][3] = nodes[NEXTNODE][3];

            //set the node we're about to be on 
            PREVNODE = NODENUM;
            NODENUM = NEXTNODE;

            //reset the beamWidth
            beamWidth = 1;
            beamStoreSpot++;


            if (nodes[NODENUM][0] == 2) {
                //start the timer for the next one!
                BEAMCOUNT = 9; //pause everything while we count
                nodes[NODENUM][99] = true;
                nodeChargeTimer(NODENUM);
            }
        }
    }

    //draw previous chunks of the beam
    for (var b = 0; b < beamStoreSpot; b++) {
        drawLine(beamStore[b][0], beamStore[b][1], beamStore[b][2], beamStore[b][3]);
        //alert(beamStore[beamStoreSpot][0]);
        //alert(beamStore[b][0] + " " + beamStore[b][1] + " " + beamStore[b][2] + " " + beamStore[b][3]);
    }
}

///////////////////////////////////////////////////////////////////////////
//FUNCTION: endStateCheck()
//
//PURPOSE: Check to see if the player has won or lost the game by hitting
//         the edge.
///////////////////////////////////////////////////////////////////////////
function endStateCheck() {
    var ctx = gameCanvas.getContext("2d");

    /////////////////
    // DID WE WIN? //
    /////////////////
    if (NODENUM == 3 && BEAMDIR == 1 && beamWidth > 60) {
        //alert("YOU WIN!");
        //player won!
        GAMESTATE = 40;
    }

    //////////////////
    // DID WE LOSE? //
    //////////////////

    if (GAMESTATE == 30 && BEAMCOUNT == 1) {
        // went too high!
        if (BEAMDIR == 0 && (NODENUM == 0 || NODENUM == 1 || NODENUM == 2 || NODENUM == 3) && beamWidth < -70) {
            //you failed
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 1; //hit a wall
            //too far right
        } else if (BEAMDIR == 1 && (NODENUM == 7 || NODENUM == 11 || NODENUM == 15) && beamWidth > 70) {
            //you failed
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 1; //hit a wall
            //too far down
        } else if (BEAMDIR == 2 && (NODENUM == 12 || NODENUM == 13 || NODENUM == 14 || NODENUM == 15) && beamWidth > 70) {
            //you failed
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 1; //hit a wall
            //too far left
        } else if (BEAMDIR == 3 && (NODENUM == 0 || NODENUM == 4 || NODENUM == 8 || NODENUM == 12) && beamWidth < -70) {
            //you failed
            FAILSTATE = true;
            GAMESTATE = 50;
            failReason = 1; //hit a wall
        }
    }
}
