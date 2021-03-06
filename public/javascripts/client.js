var socket = io();

var dealer = [];
var player = [];

var uuid;

/**
 * deal card to dealer
 *
 * Deals a card to the dealer
 */
socket.on("deal card to dealer", function(properties) {
  // Create the card and deal it
  var card = new Card(properties);
  dealer.push(card);
  card.deal($(".card-area.dealer"));

  // Log the event to the console
  var cardDescription;
  if(properties.face.down) {
    cardDescription = "A facedown card";
  } else {
    cardDescription = "A " + properties.rank + " of " + properties.suit;
  }
  printDebug(cardDescription + " was dealt to the dealer");
});

/**
 * deal card to player
 *
 * Deals a card to the player
 */
socket.on("deal card to player", function(properties) {
  // Create the card and deal it
  var card = new Card(properties);
  player.push(card);
  card.deal($(".card-area.player"));

  // Log the event to the console
  var cardDescription = "A " + properties.rank + " of " + properties.suit;
  printDebug(cardDescription + " was dealt to you");
});

/**
 * game over
 */
socket.on("game over", function(type) {
  disableButtons();
  alert(type);
  //askToPlayAgain();
});

/**
 * update dealer score
 *
 * Updates the score of the dealer
 */
socket.on("update dealer score", function(score) {
  $(".scores span.dealer").html(score);
});

/**
 * update player score
 *
 * Updates the score of the player
 */
socket.on("update player score", function(scores) {
  $(".scores span.player").html(scores[0]);
  if (typeof scores[1] !== "undefined") {
    $(".scores span.player").append(" / " + scores[1]);
  }
});

/**
 * display message
 *
 * Writes a message to the debug console
 */
socket.on("display message", function(message) {
  printDebug(message, INFO);
});

/**
 * Receives a new state from the server. The only ones there are:
 * - lobby(1) : Corresponds to OPEN state in the table. This basically means
 *              that players are allowed to join the game
 * - playing(2) : Corresponds to PLAYING in the table (naturally). No more
 *                players can be added at this point
 */
socket.on("state", function(state) {
  //printDebug("Just heard that the current state was: " + state, DEBUG);

  // If the state was lobby, add the start button
  switch (state) {
    case 1:
      switchToLobby();
      break;
    case 2:
      switchToPlaying();
      break;
  }
});

/**
 * connect
 *
 * Generates a unique ID(UUID), stores it in WebStorage and sends it to the server
 */
socket.on("connect", function () {
  if (!(uuid = localStorage.getItem("uuid"))) {
    var date = new Date();
    var randomlyGeneratedUID = Math.random().toString(36).substring(3,16);
    localStorage.setItem("uuid", randomlyGeneratedUID);
    uuid = randomlyGeneratedUID;
  }

  socket.emit("register", uuid);
});

/**
 * error
 *
 * Forwards the error to the debug console on screen and in the F12 Dev Tools
 */
socket.on("error", function(message) {
  printDebug(message, ERROR);
  console.error(message);
});

/**
 * stats
 *
 * Receives and posts the stats for all players
 */
socket.on("stats", function(players) {
  $("div.players").find("ul").empty();
  for (var i=0; i<players.length; ++i) {
    var player = players[i];
    // Construct the list item that talks about the player
    var playerListItem = $("<li></li>");
    var name = $("<p></p>")
      .append(player.uuid.substring(0,5) + " (")
      .append(player.uuid == uuid ? "You" : (player.type == "robot" ? "Robot" : "Human"))
      .append(") : ")
      .append(player.status);
    var cardList = $("<p></p>")
      .append("Cards: [ ")
      .append((player.hands[0][0] && player.hands[0][0] !== undefined ? player.hands[0][0].string : "" ));
    for (var j = 0;j < player.hands[0].length - 1; ++j) {
      cardList.append(", ?");
    }
    cardList.append(" ]");
    playerListItem
      .append(name)
      .append(cardList);
    // If it's the current player's turn, make it visible
    if(player.status === "playing") {
      playerListItem.addClass("current");
    }
    $("div.players").find("ul").append(playerListItem);
  }
});

/**
 * Flips the facedown card on the screen(if it is facedown)
 */
socket.on("flip hole card", function() {
  var card = dealer[1];
  card.flip(); // Because this is the one that's facedown
  printDebug("The dealer's card was flipped faceup");
});


/**
 * allow actions
 *
 *
 */
socket.on("allow actions", function(actions) {
  for (var action in actions) {
    $(".button-area").find("." + actions[action]).prop("disabled", false);
  }
});

/**
 * Changes the buttons in the button area to reflect the lobby's options
 */
var switchToLobby = function() {
  var buttonArea = $(".button-area");
  buttonArea.empty();

  // Create a the add AI player button
  var aiButton = $("<button></button>")
    .append("Add AI Player")
    .addClass("addAIPlayer")
    .on("click", function() {
      socket.emit("add AI player");
      // Re-enable the start game button if it was disabled
      $(".button-area").find(".startGame")
        .html("Start Game")
        .prop("disabled", false);
    });
  buttonArea.append(aiButton);

  // Create a start button
  var startButton = $("<button></button>")
    .append("Start Game")
    .addClass("startGame")
    .on("click", function() {
      socket.emit("start game");
      // Indicate to the user that we're waiting for the other players to start
      $(".button-area").find(".startGame")
        .html("Waiting for other players")
        .prop("disabled", true);
    });
  buttonArea.append(startButton);
};

/**
 * Changes the buttons in the button area to reflect the in-game options
 */
var switchToPlaying = function() {
  var buttonArea = $(".button-area");
  buttonArea.empty();

  // Create a hit button
  var hitButton = $("<button></button>")
    .append("Hit")
    .addClass("hit")
    .prop("disabled", true)
    .on("click", function() {
      socket.emit("perform action", "hit");
      disableButtons();
    });
  buttonArea.append(hitButton);

  // Create a stand button
  var standButton = $("<button></button>")
    .append("Stand")
    .addClass("stand")
    .prop("disabled", true)
    .on("click", function() {
      socket.emit("perform action", "stand");
      disableButtons();
    });
  buttonArea.append(standButton);

  // Create a split button
  var splitButton = $("<button></button>")
    .append("Split")
    .addClass("split")
    .prop("disabled", true)
    .on("click", function() {
      socket.emit("perform action", "split");
      splitButton.prop("disabled", true);
      split();
    });
  buttonArea.append(splitButton);
};

/**
 * Disables the buttons on the screen
 */
var disableButtons = function() {
  $(".button-area").find("button").prop("disabled", true);
};

/**
 * Asks the user if he wants another game
 */
var askToPlayAgain = function() {
  var buttonArea = $(".button-area");
  buttonArea.empty();

  // Create a play again button
  var playAgainButton = $("<button></button>");
  playAgainButton.append("Play Again");
  playAgainButton.on("click", function() {
    clearPlayingArea();
    socket.emit("play again");
  });
  buttonArea.append(playAgainButton);
};

/**
 * Clears all of the cards in the playing area
 */
var clearPlayingArea = function() {
  dealer = [];
  player = [];
  $(".card-area.dealer").empty();
  $(".card-area.player").empty();
};

/**
 * What to do when the reset button is clicked in the top corner
 *
 * This is only intended for debugging. It is useful to restore the server
 * restarting it and refreshing all the webpages
 */
$("#resetButton").on("click", function() {
  // Send a message to the server to reset everything
  socket.emit("reset server");
  socket.disconnect();

  // Refresh the webpage in a second
  setTimeout(function() { location.reload(); }, 1000);
});

/**
 * Moves the leftmost card to the left side and the rightmost card to the right.
 * Eventually, it should be possible to deal to both of these piles after
 * splitting them
 */
var split = function() {
  // Create the two distinct areas on the table
  $(".card-area.player").addClass("left");
  $(".card-area.split").fadeIn(500);
  // Move the top card from the left side to the right side
  $(".card-area.player > .card:last").appendTo(".card-area.split");
};