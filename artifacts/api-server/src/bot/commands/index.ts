import { Client } from "discord.js";
import { kickCommand, banCommand, unbanCommand, muteCommand, unmuteCommand, clearCommand, warnCommand, warnsCommand, unwarnCommand } from "./moderation.js";
import { lockdownCommand, unlockCommand, nukeCommand, massbanCommand, antiraidCommand, automodCommand, addwordCommand, removewordCommand, bannedwordsCommand } from "./security.js";
import { maintenanceCommand, maintenanceOffCommand, setlogchannelCommand, setwelcomeCommand, setgoodbyeCommand, panelCommand } from "./system.js";
import { sayCommand, embedCommand, announceCommand, dmCommand } from "./messaging.js";
import { serverinfoCommand, userinfoCommand, helpCommand, statsCommand } from "./info.js";
import { giveawayCommand, giveawayEndCommand } from "./giveaway.js";
import { surveyCommand, submitCommand } from "./survey.js";
import { chatCommand } from "./chat.js";
import { rulesCommand } from "./rules.js";

export function registerCommands(client: Client): any[] {
  const commandList = [
    kickCommand,
    banCommand,
    unbanCommand,
    muteCommand,
    unmuteCommand,
    clearCommand,
    warnCommand,
    warnsCommand,
    unwarnCommand,
    lockdownCommand,
    unlockCommand,
    nukeCommand,
    massbanCommand,
    antiraidCommand,
    automodCommand,
    addwordCommand,
    removewordCommand,
    bannedwordsCommand,
    maintenanceCommand,
    maintenanceOffCommand,
    setlogchannelCommand,
    setwelcomeCommand,
    setgoodbyeCommand,
    panelCommand,
    sayCommand,
    embedCommand,
    announceCommand,
    dmCommand,
    serverinfoCommand,
    userinfoCommand,
    helpCommand,
    statsCommand,
    giveawayCommand,
    giveawayEndCommand,
    surveyCommand,
    submitCommand,
    chatCommand,
    rulesCommand,
  ];

  for (const command of commandList) {
    client.commands.set(command.data.name, command);
  }

  return commandList;
}
