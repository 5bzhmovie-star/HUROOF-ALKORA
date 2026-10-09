"use client";
import React, { memo } from 'react';
import { Cell, Team, ar } from './api';
export const Board = memo(function Board({ cells, size, teams, onSelect, selected = null, path = [], disabled = false, compact = false }: {
    cells: Cell[];
    size: number;
    teams: Team[];
    onSelect?: (index: number) => void;
    selected?: number | null;
    path?: number[];
    disabled?: boolean;
    compact?: boolean;
}) { const winningCells = new Set(path); const xStep = 58, yStep = 50, points = '0,-32 28,-16 28,16 0,32 -28,16 -28,-16'; const width = (size - 1) * xStep + 124, height = (size - 1) * yStep + 106, offset = (row:number) => row % 2 ? xStep / 2 : 0; const edge = (right:boolean) => Array.from({length:size},(_,row)=>`${row ? 'L':'M'}${right ? 86+(size-1)*xStep+offset(row) : 14+offset(row)} ${53+row*yStep}`).join(' '); return <div className={'board ' + (compact ? 'compact' : '')} role="group" aria-label={`شبكة حروف ${size} في ${size}`}><div className="board-direction" style={{ color: teams[0].color }}>{teams[0].name} · من أعلى إلى أسفل</div><svg className="hex-board" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="خلايا اللعب" style={{ '--team-one': teams[0].color, '--team-two': teams[1].color } as React.CSSProperties}><path className="edge edge-one" d={`M40 12H${(size - 1) * xStep + 60} M${40+offset(size-1)} ${height - 12}H${(size - 1) * xStep + 60+offset(size-1)}`}/><path className="edge edge-two" d={`${edge(false)} ${edge(true)}`}/>{cells.map(cell => { const row = Math.floor(cell.index / size), col = cell.index % size, x = 50 + col * xStep + offset(row), y = 53 + row * yStep; const label = `حرف ${cell.letter}، ${cell.owner ? teams[cell.owner - 1].name : 'متاح'}، الصف ${ar(row + 1)} العمود ${ar(col + 1)}`; const enabled = Boolean(onSelect) && !disabled; return <g key={cell.index} transform={`translate(${x},${y})`} className={`hex ${cell.owner ? 'owned' : ''} ${selected === cell.index ? 'selected' : ''} ${winningCells.has(cell.index) ? 'winning' : ''} ${enabled ? 'interactive' : ''}`} style={cell.owner ? { '--cell-color': teams[cell.owner - 1].color } as React.CSSProperties : {}} role={enabled ? 'button' : 'img'} aria-label={label} tabIndex={enabled ? 0 : undefined} onClick={() => enabled && onSelect?.(cell.index)} onKeyDown={e => { if (enabled && ['Enter', ' '].includes(e.key)) {
    e.preventDefault();
    onSelect?.(cell.index);
} }}><polygon points={points}/><text y="3" dominantBaseline="middle" textAnchor="middle">{cell.letter}</text>{cell.owner > 0 && <text className="cell-owner" y="22" textAnchor="middle">{cell.owner === 1 ? '●' : '◆'}</text>}</g>; })}</svg><div className="board-direction bottom" style={{ color: teams[1].color }}>{teams[1].name} · من اليمين إلى اليسار</div></div>; });
export const sampleTeams = [{ name: 'الصقور', color: '#15803d' }, { name: 'النجوم', color: '#2563eb' }];
export const sampleBoard = 'فكمنسرعبحايتلزهضجوقشغخدصط'.split('').map((letter, index) => ({ index, letter, owner: [2, 6, 7, 11, 16].includes(index) ? 1 : [4, 8, 13, 17, 18].includes(index) ? 2 : 0 }));
