const { groupByProject } = require('../src/services/projects');

describe('groupByProject', () => {
  const projects = [
    { id: 'p1', name: 'Acme', color: '#3B6BFF' },
    { id: 'p2', name: 'Globex', color: '#10B981' },
  ];

  test('empty tx list returns empty', () => {
    expect(groupByProject([], projects)).toEqual([]);
  });

  test('untagged tx go to unassigned bucket', () => {
    const rows = groupByProject([{ vat: 5, amount: 105 }], projects);
    expect(rows.length).toBe(1);
    expect(rows[0].project.id).toBe('unassigned');
    expect(rows[0].totalAmt).toBe(105);
  });

  test('sums per project', () => {
    const rows = groupByProject([
      { projectId: 'p1', category: 'fuel', amount: 100, vat: 5 },
      { projectId: 'p1', category: 'office', amount: 200, vat: 10 },
      { projectId: 'p2', category: 'food', amount: 50, vat: 2.5 },
    ], projects);
    const acme = rows.find(r => r.project.id === 'p1');
    expect(acme.totalAmt).toBe(300);
    expect(acme.totalVat).toBe(15);
    expect(acme.reclaim).toBe(15);
    const globex = rows.find(r => r.project.id === 'p2');
    expect(globex.reclaim).toBe(0);
  });

  test('sorts by total spend desc', () => {
    const rows = groupByProject([
      { projectId: 'p1', amount: 50, vat: 2.5 },
      { projectId: 'p2', amount: 500, vat: 25 },
    ], projects);
    expect(rows[0].project.id).toBe('p2');
  });
});
