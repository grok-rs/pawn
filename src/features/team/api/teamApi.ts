import { commands } from '@dto/bindings';
import type { CreateTeam, UpdateTeam, AddPlayerToTeam, RemovePlayerFromTeam, CreateTeamTournamentSettings, UpdateTeamTournamentSettings } from '@dto/bindings';

export const getTeamsByTournament = (tournamentId: number) => commands.getTeamsByTournament(tournamentId);
export const createTeam = (data: CreateTeam) => commands.createTeam(data);
export const updateTeam = (data: UpdateTeam) => commands.updateTeam(data);
export const deleteTeam = (teamId: number) => commands.deleteTeam(teamId);
export const addPlayerToTeam = (data: AddPlayerToTeam) => commands.addPlayerToTeam(data);
export const removePlayerFromTeam = (data: RemovePlayerFromTeam) => commands.removePlayerFromTeam(data);
export const getTeamStandings = (tournamentId: number) => commands.getTeamStandings(tournamentId);
export const createTeamTournamentSettings = (data: CreateTeamTournamentSettings) => commands.createTeamTournamentSettings(data);
export const updateTeamTournamentSettings = (data: UpdateTeamTournamentSettings) => commands.updateTeamTournamentSettings(data);
