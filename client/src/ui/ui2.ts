// ui2.ts - Full UI Manager with Prestige Voting System integrated

import $ from "jquery";
import * as PIXI from "pixi.js";
import { GameObjectDefs } from "../shared/gameDefs";
import { helpers } from "../shared/helpers";
import { v2, Vec2 } from "../shared/math";
import { GasRenderer } from "../rendering/GasRenderer";
import { GasSafeZoneRenderer } from "../rendering/GasSafeZoneRenderer";
import { MapSpriteBarn } from "../rendering/MapSpriteBarn";
import { MapIndicatorBarn } from "../rendering/MapIndicatorBarn";
import { RoleDef } from "../shared/roles";
import { ContainerWithMask } from "../types";

export class UiManager {
    game: any;
    localization: any;
    roleMenuElem: JQuery<HTMLElement>;
    roleDisplayed: string = "";
    prestigePoints: number = 0;
    dailyHonorVotesLeft: number = 3;
    dailyReportVotesLeft: number = 3;
    votedPlayers: Set<number> = new Set();

    // UI elements
    bigmap: JQuery<HTMLElement>;
    bigmapCollision: JQuery<HTMLElement>;
    bigmapClose: JQuery<HTMLElement>;
    moveStyleButton: JQuery<HTMLElement>;
    aimLineButton: JQuery<HTMLElement>;
    aimStyleButton: JQuery<HTMLElement>;
    fullScreenButton: JQuery<HTMLElement>;
    resumeButton: JQuery<HTMLElement>;
    specStatsButton: JQuery<HTMLElement>;
    specNextButton: JQuery<HTMLElement>;
    specPrevButton: JQuery<HTMLElement>;
    specBegin: boolean = false;
    specNext: boolean = false;
    specPrev: boolean = false;

    interactionElems: JQuery<HTMLElement>;
    interactionTouched: boolean = false;
    reloadElems: JQuery<HTMLElement>;
    reloadTouched: boolean = false;

    flairElems: JQuery<HTMLElement>;
    flairId: number = 0;

    healthRed = new PIXI.Color(0xff0000);
    healthDarkpink = new PIXI.Color(0xff2d2d);
    healthLightpink = new PIXI.Color(0xff7070);
    healthWhite = new PIXI.Color(0xffffff);
    healthGrey = new PIXI.Color(0xb3b3b3);

    minimapDisplayed: boolean = true;
    visibilityMode: number = 0;
    hudVisible: boolean = true;

    gasRenderer!: GasRenderer;
    gasSafeZoneRenderer = new GasSafeZoneRenderer();
    sentAdStatus: boolean = false;
    frame: number = 0;
    weapsDirty: boolean = false;
    weapSwitches: JQuery<HTMLElement>;
    weapNoSwitches: JQuery<HTMLElement>;
    weapDraggedId: number = 0;
    swapWeapSlots: boolean = false;
    weapDraggedDiv: JQuery<HTMLElement> | null = null;
    weapDragging: boolean = false;
    weapDropped: boolean = false;

    mapSpriteBarn = new MapSpriteBarn();
    mapIndicatorBarn!: MapIndicatorBarn;
    playerMapSprites: any[] = [];
    playerPingSprites: Record<number, any[]> = {};
    container = new PIXI.Container() as ContainerWithMask;

    resetWeapSlotStyling!: () => void;
    display: {
        gas: PIXI.DisplayObject;
        gasSafeZone: PIXI.Container;
        airstrikeZones: PIXI.Container;
        mapSprites: PIXI.Container;
        teammates: PIXI.Container;
        player: PIXI.Container;
        border: PIXI.Graphics;
    };

    mapSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    bigmapDisplayed: boolean = false;
    screenScaleFactor: number = 1;
    minimapPos!: Vec2;

    dead: boolean = false;

    muteButton: JQuery<HTMLElement>;
    muteButtonImage!: JQuery<HTMLImageElement>;
    muteOffImg: string = "audio-off.img";
    muteOnImg: string = "audio-on.img";

    displayingStats: boolean = false;
    teamMemberHealthBarWidth!: number;

    teamMemberHeight: number = 48;
    groupPlayerCount: number = 0;
    teamSelectors: Array<{
        teamNameHtml: string;
        groupId: JQuery<HTMLElement>;
        groupIdDisplayed: boolean;
        teamName: JQuery<HTMLElement>;
        teamIcon: JQuery<HTMLElement>;
        teamStatus: JQuery<HTMLElement>;
        teamHealthInner: JQuery<HTMLElement>;
        teamColor: JQuery<HTMLElement>;
        playerId: number;
        prevHealth: number;
        prevStatus: any;
        indicators: Record<string, { elem: JQuery<HTMLElement>; displayed: boolean; displayAll?: boolean }>;
    }> = [];

    displayOldMapSprites: boolean = false;

    constructor(game: any, localization: any) {
        this.game = game;
        this.localization = localization;
        this.roleMenuElem = $("#ui-role-menu");
        this.bigmap = $("#big-map");
        this.bigmapCollision = $("#big-map-collision");
        this.bigmapClose = $("#big-map-close");
        this.moveStyleButton = $("#btn-game-move-style");
        this.aimLineButton = $("#btn-game-aim-line");
        this.aimStyleButton = $("#btn-game-aim-style");
        this.fullScreenButton = $("#btn-game-fullscreen");
        this.resumeButton = $("#btn-game-resume");
        this.specStatsButton = $("#btn-spectate-view-stats");
        this.specNextButton = $("#btn-spectate-next-player");
        this.specPrevButton = $("#btn-spectate-prev-player");
        this.interactionElems = $("#ui-interaction-press, #ui-interaction");
        this.reloadElems = $("#ui-current-clip, #ui-remaining-ammo, #ui-reload-button-container");
        this.flairElems = $(".ui-health-flair");
        this.weapSwitches = $("#ui-weapon-id-1, #ui-weapon-id-2");
        this.weapNoSwitches = $("#ui-weapon-id-3, #ui-weapon-id-4");
        this.muteButton = $("#ui-mute-ingame");

        this.createPrestigeCounter();
    }
    // === Prestige System UI ===
    createPrestigeCounter() {
        const counter = $("<div/>", { id: "ui-prestige-counter" })
            .css({
                position: "absolute",
                right: "20px",
                top: "100px",
                color: "gold",
                "font-size": "20px",
                "font-weight": "bold",
                "z-index": 1000,
            })
            .text(`Prestige: ${this.prestigePoints}`);
        $("body").append(counter);
    }

    updatePrestigeCounter(newPoints: number) {
        this.prestigePoints = newPoints;
        $("#ui-prestige-counter").text(`Prestige: ${this.prestigePoints}`);
    }

    showPostMatchVoting(players: { id: number; name: string }[]) {
        const container = $("<div/>", { id: "ui-postmatch-voting" })
            .css({
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                "background-color": "rgba(0, 0, 0, 0.8)",
                padding: "20px",
                "border-radius": "10px",
                "z-index": 2000,
                color: "white",
                "text-align": "center",
            });

        container.append("<h2>Vote Players</h2>");

        players.forEach((player) => {
            if (player.id === this.game.myPlayerId || this.votedPlayers.has(player.id)) return;

            const playerDiv = $("<div/>").css({ margin: "10px 0" });
            playerDiv.append(`<span>${player.name}</span>`);

            const honorBtn = $("<button/>")
                .text(`Honor (+1) (${this.dailyHonorVotesLeft} Left Today)`)
                .css({ margin: "0 5px", color: "green" })
                .on("click", () => this.castPrestigeVote(player.id, true, honorBtn, reportBtn));

            const reportBtn = $("<button/>")
                .text(`Report (-1) (${this.dailyReportVotesLeft} Left Today)`)
                .css({ margin: "0 5px", color: "red" })
                .on("click", () => this.castPrestigeVote(player.id, false, honorBtn, reportBtn));

            playerDiv.append(honorBtn, reportBtn);
            container.append(playerDiv);
        });

        const closeBtn = $("<button/>")
            .text("Close")
            .css({ display: "block", margin: "20px auto 0 auto" })
            .on("click", () => container.remove());

        container.append(closeBtn);
        $("body").append(container);
    }

    castPrestigeVote(
        playerId: number,
        isHonor: boolean,
        honorBtn: JQuery<HTMLElement>,
        reportBtn: JQuery<HTMLElement>
    ) {
        if (this.votedPlayers.has(playerId)) return;

        if (isHonor && this.dailyHonorVotesLeft <= 0) return;
        if (!isHonor && this.dailyReportVotesLeft <= 0) return;

        this.votedPlayers.add(playerId);

        if (isHonor) {
            this.dailyHonorVotesLeft--;
            this.game.server.send("prestige-vote", { targetId: playerId, delta: 1 });
        } else {
            this.dailyReportVotesLeft--;
            this.game.server.send("prestige-vote", { targetId: playerId, delta: -1 });
        }

        honorBtn.remove();
        reportBtn.remove();
    }
    resetDailyPrestigeVotes() {
        this.dailyHonorVotesLeft = 3;
        this.dailyReportVotesLeft = 3;
        this.votedPlayers.clear();
    }

    fetchPrestigeFromServer() {
        this.game.server.send("get-prestige", {}, (response: { prestige: number }) => {
            if (response && typeof response.prestige === "number") {
                this.updatePrestigeCounter(response.prestige);
            }
        });
    }

    handleMatchEndPrestigeUpdate(delta: number) {
        this.updatePrestigeCounter(this.prestigePoints + delta);
    }

    initPrestigeSystem() {
        this.prestigePoints = 0;
        this.dailyHonorVotesLeft = 3;
        this.dailyReportVotesLeft = 3;
        this.votedPlayers = new Set<number>();

        this.createPrestigeCounter();

        // Fetch initial prestige from server
        this.fetchPrestigeFromServer();

        // Reset daily votes at midnight
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                this.resetDailyPrestigeVotes();
            }
        }, 60000); // Check every minute
    }
}
    ShowPostMatchPrestigeVoting((players: { id: number; name: string }[]) => {
    // code that handles players voting goes here
});

        const votingContainer = $("<div/>", { id: "prestige-voting-container" }).css({
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.8)",
            padding: "20px",
            borderRadius: "10px",
            zIndex: 10000,
            color: "white",
        });

        players.forEach((player) => {
            const playerRow = $("<div/>").css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
            });

            const playerName = $("<span/>").text(player.name);

            const honorButton = $("<button/>")
                .addClass("honor-btn")
                .text(`Honor (+1) (${this.dailyHonorVotesLeft} Left Today)`)
                .css({ marginLeft: "10px", background: "green", color: "white" })
                .on("click", () => {
                    this.votePlayer(player.id, "honor", honorButton, reportButton);
                });

            const reportButton = $("<button/>")
                .addClass("report-btn")
                .text(`Report (-1) (${this.dailyReportVotesLeft} Left Today)`)
                .css({ marginLeft: "10px", background: "red", color: "white" })
                .on("click", () => {
                    this.votePlayer(player.id, "report", honorButton, reportButton);
                });

            playerRow.append(playerName, honorButton, reportButton);
            votingContainer.append(playerRow);
        });

        $("body").append(votingContainer);
    }
    votePlayer(playerId: number, type: "honor" | "report", honorBtn: JQuery<HTMLElement>, reportBtn: JQuery<HTMLElement>) {
        if (this.votedPlayers.has(playerId)) return;

        if (type === "honor" && this.dailyHonorVotesLeft > 0) {
            this.dailyHonorVotesLeft--;
            this.prestigePoints++;
        } else if (type === "report" && this.dailyReportVotesLeft > 0) {
            this.dailyReportVotesLeft--;
            this.prestigePoints--;
        } else {
            return; // No votes left
        }

        this.votedPlayers.add(playerId);
        honorBtn.remove();
        reportBtn.remove();
        this.updatePrestigeDisplay();

        // TODO: Send vote to server via API
        console.log(`Voted ${type} for player ${playerId}. Current prestige: ${this.prestigePoints}`);
    }

    updatePrestigeDisplay() {
        if (!this.prestigeDisplay) {
            this.prestigeDisplay = $("<div/>", { id: "prestige-display" }).css({
                position: "absolute",
                top: "10%",
                right: "20px",
                background: "rgba(0, 0, 0, 0.7)",
                color: "white",
                padding: "5px 10px",
                borderRadius: "8px",
                fontSize: "16px",
                zIndex: 9999,
            });
            $("body").append(this.prestigeDisplay);
        }
        this.prestigeDisplay.text(`Prestige: ${this.prestigePoints}`);
    }

    fetchPrestigeFromServer() {
        // TODO: Replace with actual API call
        console.log("Fetching latest prestige from server...");
        // Simulate fetching
        setTimeout(() => {
            this.prestigePoints = this.prestigePoints; // keep the same for now
            this.updatePrestigeDisplay();
        }, 500);
    }
}
