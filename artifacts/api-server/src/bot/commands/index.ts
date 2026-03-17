import { Client } from "discord.js";
import { kickCommand } from "./moderation.js";
import { banCommand } from "./moderation.js";
import { unbanCommand } from "./moderation.js";
import { muteCommand } from "./moderation.js";
import { unmuteCommand } from "./moderation.js";
import { clearCommand } from "./moderation.js";
import { warnCommand } from "./moderation.js";
import { warnsCommand } from "./moderation.js";
import { unwarnCommand } from "./moderation.js";
import { lockdownCommand, unlockCommand } from "./security.js";
import { nukeCommand } from "./security.js";
import { massbanCommand } from "./security.js";
import { antiraidCommand } from "./security.js";
import { automodCommand } from "./security.js";
import { addwordCommand, removewordCommand, bannedwordsCommand } from "./security.js";
import { maintenanceCommand, maintenanceOffCommand } from "./system.js";
import { setlogchannelCommand } from "./system.js";
import { sayCommand, embedCommand, announceCommand, dmCommand } from "./messaging.js";
import { serverinfoCommand, userinfoCommand, commandsListCommand } from "./info.js";
import { giveawayCommand, giveawayEndCommand } from "./giveaway.js";
import { surveyCommand } from "./survey.js";
import { chatCommand } from "./chat.js";

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
    sayCommand,
    embedCommand,
    announceCommand,
    dmCommand,
    serverinfoCommand,
    userinfoCommand,
    commandsListCommand,
    giveawayCommand,
    giveawayEndCommand,
    surveyCommand,
    chatCommand,
  ];

  for (const command of commandList) {
    client.commands.set(command.data.name, command);
  }

  return commandList;
}
