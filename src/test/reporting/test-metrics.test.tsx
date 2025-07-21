import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Test metrics and reporting utilities
const TestMetricsCollector = {
  // Collect test execution metrics
  collectTestMetrics: (
    testResults: any[]
  ): {
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      passRate: number;
      duration: number;
    };
    coverage: {
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
    performance: {
      averageTestTime: number;
      slowestTests: Array<{ name: string; duration: number }>;
      fastestTests: Array<{ name: string; duration: number }>;
    };
    quality: {
      flakiness: number;
      reliability: number;
      maintainability: string;
    };
  } => {
    const total = testResults.length;
    const passed = testResults.filter(t => t.status === 'passed').length;
    const failed = testResults.filter(t => t.status === 'failed').length;
    const skipped = testResults.filter(t => t.status === 'skipped').length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const duration = testResults.reduce((sum, t) => sum + (t.duration || 0), 0);

    // Sort tests by duration
    const sortedByDuration = [...testResults]
      .filter(t => t.duration)
      .sort((a, b) => b.duration - a.duration);

    const slowestTests = sortedByDuration.slice(0, 5).map(t => ({
      name: t.name,
      duration: t.duration,
    }));

    const fastestTests = sortedByDuration
      .slice(-5)
      .reverse()
      .map(t => ({
        name: t.name,
        duration: t.duration,
      }));

    const averageTestTime =
      duration / (testResults.filter(t => t.duration).length || 1);

    // Calculate flakiness (tests that sometimes pass/fail)
    const flakyTests = testResults.filter(t => t.flaky === true).length;
    const flakiness = total > 0 ? (flakyTests / total) * 100 : 0;

    // Reliability based on pass rate and flakiness
    const reliability = Math.max(0, passRate - flakiness);

    // Maintainability based on test complexity and coverage
    let maintainability = 'Good';
    if (averageTestTime > 1000) maintainability = 'Poor';
    else if (averageTestTime > 500) maintainability = 'Fair';

    return {
      summary: {
        total,
        passed,
        failed,
        skipped,
        passRate: Math.round(passRate * 100) / 100,
        duration: Math.round(duration),
      },
      coverage: {
        lines: 85.5, // Mock coverage data
        branches: 78.2,
        functions: 92.1,
        statements: 86.7,
      },
      performance: {
        averageTestTime: Math.round(averageTestTime),
        slowestTests,
        fastestTests,
      },
      quality: {
        flakiness: Math.round(flakiness * 100) / 100,
        reliability: Math.round(reliability * 100) / 100,
        maintainability,
      },
    };
  },

  // Generate test trend analysis
  generateTrendAnalysis: (
    historicalData: any[]
  ): {
    trends: {
      passRate: 'improving' | 'declining' | 'stable';
      coverage: 'improving' | 'declining' | 'stable';
      performance: 'improving' | 'declining' | 'stable';
    };
    predictions: {
      nextWeekPassRate: number;
      coverageTarget: number;
      performanceTarget: number;
    };
  } => {
    if (historicalData.length < 2) {
      return {
        trends: {
          passRate: 'stable',
          coverage: 'stable',
          performance: 'stable',
        },
        predictions: {
          nextWeekPassRate: 95,
          coverageTarget: 90,
          performanceTarget: 500,
        },
      };
    }

    const recent = historicalData.slice(-5);
    const older = historicalData.slice(-10, -5);

    const recentPassRate =
      recent.reduce((sum, d) => sum + d.passRate, 0) / recent.length;
    const olderPassRate =
      older.reduce((sum, d) => sum + d.passRate, 0) / older.length;

    const recentCoverage =
      recent.reduce((sum, d) => sum + d.coverage, 0) / recent.length;
    const olderCoverage =
      older.reduce((sum, d) => sum + d.coverage, 0) / older.length;

    const recentPerformance =
      recent.reduce((sum, d) => sum + d.avgTestTime, 0) / recent.length;
    const olderPerformance =
      older.reduce((sum, d) => sum + d.avgTestTime, 0) / older.length;

    const getTrend = (recent: number, older: number, threshold = 2) => {
      const diff = recent - older;
      if (Math.abs(diff) < threshold) return 'stable';
      return diff > 0 ? 'improving' : 'declining';
    };

    return {
      trends: {
        passRate: getTrend(recentPassRate, olderPassRate, 1),
        coverage: getTrend(recentCoverage, olderCoverage, 1),
        performance: getTrend(olderPerformance, recentPerformance, 50), // Lower is better for performance
      },
      predictions: {
        nextWeekPassRate: Math.min(
          100,
          recentPassRate + (recentPassRate - olderPassRate)
        ),
        coverageTarget: Math.min(100, recentCoverage + 2),
        performanceTarget: Math.max(100, recentPerformance * 0.9),
      },
    };
  },

  // Generate quality gates assessment
  assessQualityGates: (
    metrics: any
  ): {
    gates: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      actual: number | string;
      expected: number | string;
      message: string;
    }>;
    overallStatus: 'pass' | 'fail' | 'warning';
  } => {
    const gates = [
      {
        name: 'Pass Rate',
        threshold: 95,
        actual: metrics.summary.passRate,
        critical: true,
      },
      {
        name: 'Line Coverage',
        threshold: 80,
        actual: metrics.coverage.lines,
        critical: true,
      },
      {
        name: 'Branch Coverage',
        threshold: 75,
        actual: metrics.coverage.branches,
        critical: false,
      },
      {
        name: 'Average Test Time',
        threshold: 1000,
        actual: metrics.performance.averageTestTime,
        inverse: true, // Lower is better
        critical: false,
      },
      {
        name: 'Test Reliability',
        threshold: 90,
        actual: metrics.quality.reliability,
        critical: true,
      },
      {
        name: 'Flakiness Rate',
        threshold: 5,
        actual: metrics.quality.flakiness,
        inverse: true, // Lower is better
        critical: false,
      },
    ];

    const results = gates.map(gate => {
      const passes = gate.inverse
        ? gate.actual <= gate.threshold
        : gate.actual >= gate.threshold;

      const withinWarningRange = gate.inverse
        ? gate.actual <= gate.threshold * 1.2
        : gate.actual >= gate.threshold * 0.8;

      let status: 'pass' | 'fail' | 'warning';
      if (passes) status = 'pass';
      else if (withinWarningRange) status = 'warning';
      else status = 'fail';

      const message = passes
        ? 'Meets quality standards'
        : `${gate.inverse ? 'Exceeds' : 'Below'} threshold of ${gate.threshold}`;

      return {
        name: gate.name,
        status,
        actual: gate.actual,
        expected: gate.threshold,
        message,
      };
    });

    const criticalFailures = results.filter(
      r => r.status === 'fail' && gates.find(g => g.name === r.name)?.critical
    );
    const warnings = results.filter(r => r.status === 'warning');

    let overallStatus: 'pass' | 'fail' | 'warning';
    if (criticalFailures.length > 0) overallStatus = 'fail';
    else if (warnings.length > 0) overallStatus = 'warning';
    else overallStatus = 'pass';

    return { gates: results, overallStatus };
  },

  // Export test results in various formats
  exportResults: (metrics: any, format: 'json' | 'xml' | 'html' | 'csv') => {
    switch (format) {
      case 'json':
        return {
          format: 'json',
          content: JSON.stringify(metrics, null, 2),
          filename: `test-results-${Date.now()}.json`,
        };

      case 'xml': {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testResults>
  <summary>
    <total>${metrics.summary.total}</total>
    <passed>${metrics.summary.passed}</passed>
    <failed>${metrics.summary.failed}</failed>
    <passRate>${metrics.summary.passRate}</passRate>
  </summary>
  <coverage>
    <lines>${metrics.coverage.lines}</lines>
    <branches>${metrics.coverage.branches}</branches>
    <functions>${metrics.coverage.functions}</functions>
  </coverage>
</testResults>`;
        return {
          format: 'xml',
          content: xml,
          filename: `test-results-${Date.now()}.xml`,
        };
      }

      case 'html': {
        const html = `<!DOCTYPE html>
<html>
<head><title>Test Results Report</title></head>
<body>
  <h1>Test Results Report</h1>
  <h2>Summary</h2>
  <p>Pass Rate: ${metrics.summary.passRate}%</p>
  <p>Total Tests: ${metrics.summary.total}</p>
  <h2>Coverage</h2>
  <p>Line Coverage: ${metrics.coverage.lines}%</p>
</body>
</html>`;
        return {
          format: 'html',
          content: html,
          filename: `test-results-${Date.now()}.html`,
        };
      }

      case 'csv': {
        const csv = `Metric,Value
Pass Rate,${metrics.summary.passRate}%
Total Tests,${metrics.summary.total}
Line Coverage,${metrics.coverage.lines}%
Branch Coverage,${metrics.coverage.branches}%
Average Test Time,${metrics.performance.averageTestTime}ms`;
        return {
          format: 'csv',
          content: csv,
          filename: `test-results-${Date.now()}.csv`,
        };
      }

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  },

  // Calculate test suite health score
  calculateHealthScore: (
    metrics: any
  ): {
    score: number;
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
    factors: Array<{
      name: string;
      score: number;
      weight: number;
      impact: number;
    }>;
  } => {
    const factors = [
      {
        name: 'Pass Rate',
        value: metrics.summary.passRate,
        weight: 0.3,
        target: 95,
      },
      {
        name: 'Coverage',
        value: metrics.coverage.lines,
        weight: 0.25,
        target: 85,
      },
      {
        name: 'Performance',
        value: Math.max(0, 100 - metrics.performance.averageTestTime / 10),
        weight: 0.2,
        target: 90,
      },
      {
        name: 'Reliability',
        value: metrics.quality.reliability,
        weight: 0.15,
        target: 90,
      },
      {
        name: 'Maintainability',
        value:
          metrics.quality.maintainability === 'Good'
            ? 95
            : metrics.quality.maintainability === 'Fair'
              ? 75
              : 50,
        weight: 0.1,
        target: 80,
      },
    ];

    const scoredFactors = factors.map(factor => {
      const score = Math.min(100, (factor.value / factor.target) * 100);
      const impact = score * factor.weight;
      return {
        name: factor.name,
        score: Math.round(score),
        weight: factor.weight,
        impact: Math.round(impact * 100) / 100,
      };
    });

    const totalScore = scoredFactors.reduce((sum, f) => sum + f.impact, 0);

    let grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
    if (totalScore >= 97) grade = 'A+';
    else if (totalScore >= 93) grade = 'A';
    else if (totalScore >= 87) grade = 'B+';
    else if (totalScore >= 83) grade = 'B';
    else if (totalScore >= 77) grade = 'C+';
    else if (totalScore >= 70) grade = 'C';
    else if (totalScore >= 60) grade = 'D';
    else grade = 'F';

    return {
      score: Math.round(totalScore),
      grade,
      factors: scoredFactors,
    };
  },
};

// Test results dashboard component
const TestResultsDashboard = ({
  testResults = [],
}: {
  testResults?: any[];
}) => {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [selectedView, setSelectedView] = React.useState<
    'summary' | 'coverage' | 'performance' | 'quality'
  >('summary');
  const [exportFormat, setExportFormat] = React.useState<
    'json' | 'xml' | 'html' | 'csv'
  >('json');

  React.useEffect(() => {
    if (testResults.length > 0) {
      const collectedMetrics =
        TestMetricsCollector.collectTestMetrics(testResults);
      setMetrics(collectedMetrics);
    }
  }, [testResults]);

  const handleExport = () => {
    if (!metrics) return;

    const exported = TestMetricsCollector.exportResults(metrics, exportFormat);

    // Create download link
    const blob = new Blob([exported.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exported.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!metrics) {
    return (
      <div data-testid="test-dashboard-empty">
        <p>No test results available. Run tests to see metrics.</p>
      </div>
    );
  }

  const healthScore = TestMetricsCollector.calculateHealthScore(metrics);
  const qualityGates = TestMetricsCollector.assessQualityGates(metrics);

  return (
    <div data-testid="test-results-dashboard">
      <div data-testid="dashboard-header">
        <h2>Test Results Dashboard</h2>
        <div data-testid="health-score">
          Health Score: {healthScore.score}/100 (Grade: {healthScore.grade})
        </div>
      </div>

      <div data-testid="dashboard-tabs">
        {['summary', 'coverage', 'performance', 'quality'].map(view => (
          <button
            key={view}
            data-testid={`tab-${view}`}
            onClick={() => setSelectedView(view as any)}
            className={selectedView === view ? 'active' : ''}
            style={{
              padding: '8px 16px',
              margin: '0 4px',
              backgroundColor: selectedView === view ? '#007bff' : '#f8f9fa',
              color: selectedView === view ? '#fff' : '#000',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {view}
          </button>
        ))}
      </div>

      <div data-testid="dashboard-content">
        {selectedView === 'summary' && (
          <div data-testid="summary-view">
            <h3>Test Summary</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              <div data-testid="summary-card-total">
                <strong>Total Tests</strong>
                <div style={{ fontSize: '2em', color: '#007bff' }}>
                  {metrics.summary.total}
                </div>
              </div>
              <div data-testid="summary-card-passed">
                <strong>Passed</strong>
                <div style={{ fontSize: '2em', color: '#28a745' }}>
                  {metrics.summary.passed}
                </div>
              </div>
              <div data-testid="summary-card-failed">
                <strong>Failed</strong>
                <div style={{ fontSize: '2em', color: '#dc3545' }}>
                  {metrics.summary.failed}
                </div>
              </div>
              <div data-testid="summary-card-pass-rate">
                <strong>Pass Rate</strong>
                <div
                  style={{
                    fontSize: '2em',
                    color:
                      metrics.summary.passRate >= 95 ? '#28a745' : '#ffc107',
                  }}
                >
                  {metrics.summary.passRate}%
                </div>
              </div>
            </div>

            <div data-testid="quality-gates" style={{ marginTop: '24px' }}>
              <h4>Quality Gates</h4>
              <div
                data-testid="overall-status"
                style={{
                  padding: '12px',
                  borderRadius: '4px',
                  backgroundColor:
                    qualityGates.overallStatus === 'pass'
                      ? '#d4edda'
                      : qualityGates.overallStatus === 'warning'
                        ? '#fff3cd'
                        : '#f8d7da',
                  color:
                    qualityGates.overallStatus === 'pass'
                      ? '#155724'
                      : qualityGates.overallStatus === 'warning'
                        ? '#856404'
                        : '#721c24',
                  marginBottom: '16px',
                }}
              >
                Overall Status: {qualityGates.overallStatus.toUpperCase()}
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {qualityGates.gates.map((gate, index) => (
                  <div
                    key={index}
                    data-testid={`quality-gate-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderLeft: `4px solid ${gate.status === 'pass' ? '#28a745' : gate.status === 'warning' ? '#ffc107' : '#dc3545'}`,
                      backgroundColor: '#f8f9fa',
                    }}
                  >
                    <span>{gate.name}</span>
                    <span>
                      {gate.actual} (Expected: {gate.expected})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedView === 'coverage' && (
          <div data-testid="coverage-view">
            <h3>Code Coverage</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}
            >
              {[
                { name: 'Lines', value: metrics.coverage.lines, target: 80 },
                {
                  name: 'Branches',
                  value: metrics.coverage.branches,
                  target: 75,
                },
                {
                  name: 'Functions',
                  value: metrics.coverage.functions,
                  target: 85,
                },
                {
                  name: 'Statements',
                  value: metrics.coverage.statements,
                  target: 80,
                },
              ].map(item => (
                <div
                  key={item.name}
                  data-testid={`coverage-${item.name.toLowerCase()}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.value}%</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '20px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, item.value)}%`,
                        height: '100%',
                        backgroundColor:
                          item.value >= item.target ? '#28a745' : '#ffc107',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginTop: '4px',
                    }}
                  >
                    Target: {item.target}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedView === 'performance' && (
          <div data-testid="performance-view">
            <h3>Performance Metrics</h3>

            <div data-testid="performance-summary">
              <div>
                Average Test Time: {metrics.performance.averageTestTime}ms
              </div>
              <div>Total Duration: {metrics.summary.duration}ms</div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                marginTop: '24px',
              }}
            >
              <div data-testid="slowest-tests">
                <h4>Slowest Tests</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {metrics.performance.slowestTests.map(
                    (test: any, index: number) => (
                      <li
                        key={index}
                        data-testid={`slow-test-${index}`}
                        style={{
                          padding: '8px',
                          marginBottom: '4px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{test.name}</span>
                        <span>{test.duration}ms</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div data-testid="fastest-tests">
                <h4>Fastest Tests</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {metrics.performance.fastestTests.map(
                    (test: any, index: number) => (
                      <li
                        key={index}
                        data-testid={`fast-test-${index}`}
                        style={{
                          padding: '8px',
                          marginBottom: '4px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{test.name}</span>
                        <span>{test.duration}ms</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'quality' && (
          <div data-testid="quality-view">
            <h3>Quality Metrics</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              <div data-testid="quality-reliability">
                <strong>Reliability</strong>
                <div style={{ fontSize: '2em', color: '#007bff' }}>
                  {metrics.quality.reliability}%
                </div>
              </div>
              <div data-testid="quality-flakiness">
                <strong>Flakiness</strong>
                <div style={{ fontSize: '2em', color: '#dc3545' }}>
                  {metrics.quality.flakiness}%
                </div>
              </div>
              <div data-testid="quality-maintainability">
                <strong>Maintainability</strong>
                <div style={{ fontSize: '2em', color: '#28a745' }}>
                  {metrics.quality.maintainability}
                </div>
              </div>
            </div>

            <div
              data-testid="health-score-breakdown"
              style={{ marginTop: '24px' }}
            >
              <h4>Health Score Breakdown</h4>
              <div>
                Total Score: {healthScore.score}/100 (Grade: {healthScore.grade}
                )
              </div>

              <div style={{ marginTop: '16px' }}>
                {healthScore.factors.map((factor, index) => (
                  <div
                    key={index}
                    data-testid={`health-factor-${index}`}
                    style={{ marginBottom: '12px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span>{factor.name}</span>
                      <span>
                        {factor.score}/100 (Weight:{' '}
                        {(factor.weight * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '16px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${factor.score}%`,
                          height: '100%',
                          backgroundColor:
                            factor.score >= 80
                              ? '#28a745'
                              : factor.score >= 60
                                ? '#ffc107'
                                : '#dc3545',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        data-testid="dashboard-export"
        style={{
          marginTop: '24px',
          padding: '16px',
          borderTop: '1px solid #ccc',
        }}
      >
        <h4>Export Results</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            data-testid="export-format"
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value as any)}
          >
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="html">HTML</option>
            <option value="csv">CSV</option>
          </select>

          <button
            data-testid="export-button"
            onClick={handleExport}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

// Mock test data generator
const generateMockTestData = (count: number, passRate: number = 0.9) => {
  return Array.from({ length: count }, (_, i) => ({
    name: `Test Case ${i + 1}`,
    status:
      Math.random() < passRate
        ? 'passed'
        : Math.random() < 0.5
          ? 'failed'
          : 'skipped',
    duration: Math.floor(Math.random() * 2000) + 50,
    flaky: Math.random() < 0.1, // 10% flaky tests
    category: ['unit', 'integration', 'e2e'][Math.floor(Math.random() * 3)],
  }));
};

// Test trends visualization component
const TestTrendsChart = ({ historicalData }: { historicalData: any[] }) => {
  const trends = TestMetricsCollector.generateTrendAnalysis(historicalData);

  return (
    <div data-testid="test-trends-chart">
      <h3>Test Trends Analysis</h3>

      <div data-testid="trends-summary">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div data-testid="trend-pass-rate">
            <strong>Pass Rate Trend</strong>
            <div
              style={{
                color:
                  trends.trends.passRate === 'improving'
                    ? '#28a745'
                    : trends.trends.passRate === 'declining'
                      ? '#dc3545'
                      : '#007bff',
              }}
            >
              {trends.trends.passRate.toUpperCase()}
            </div>
          </div>

          <div data-testid="trend-coverage">
            <strong>Coverage Trend</strong>
            <div
              style={{
                color:
                  trends.trends.coverage === 'improving'
                    ? '#28a745'
                    : trends.trends.coverage === 'declining'
                      ? '#dc3545'
                      : '#007bff',
              }}
            >
              {trends.trends.coverage.toUpperCase()}
            </div>
          </div>

          <div data-testid="trend-performance">
            <strong>Performance Trend</strong>
            <div
              style={{
                color:
                  trends.trends.performance === 'improving'
                    ? '#28a745'
                    : trends.trends.performance === 'declining'
                      ? '#dc3545'
                      : '#007bff',
              }}
            >
              {trends.trends.performance.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div data-testid="predictions">
        <h4>Predictions</h4>
        <div>
          Next Week Pass Rate: {trends.predictions.nextWeekPassRate.toFixed(1)}%
        </div>
        <div>
          Coverage Target: {trends.predictions.coverageTarget.toFixed(1)}%
        </div>
        <div>
          Performance Target: {trends.predictions.performanceTarget.toFixed(0)}
          ms
        </div>
      </div>

      {historicalData.length > 0 && (
        <div data-testid="historical-data">
          <h4>Historical Data</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {historicalData.map((data, index) => (
              <div
                key={index}
                data-testid={`historical-${index}`}
                style={{
                  padding: '4px 8px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Run {index + 1}</span>
                <span>
                  Pass: {data.passRate}%, Coverage: {data.coverage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

describe('Comprehensive Test Reporting and Metrics Tests', () => {
  describe('Test Metrics Collection', () => {
    test('should collect basic test metrics', () => {
      const testResults = [
        { name: 'Test 1', status: 'passed', duration: 150 },
        { name: 'Test 2', status: 'failed', duration: 300 },
        { name: 'Test 3', status: 'passed', duration: 100 },
        { name: 'Test 4', status: 'skipped', duration: 0 },
      ];

      const metrics = TestMetricsCollector.collectTestMetrics(testResults);

      expect(metrics.summary.total).toBe(4);
      expect(metrics.summary.passed).toBe(2);
      expect(metrics.summary.failed).toBe(1);
      expect(metrics.summary.skipped).toBe(1);
      expect(metrics.summary.passRate).toBe(50);
      expect(metrics.summary.duration).toBe(550);
    });

    test('should calculate performance metrics', () => {
      const testResults = [
        { name: 'Fast Test', status: 'passed', duration: 50 },
        { name: 'Medium Test', status: 'passed', duration: 150 },
        { name: 'Slow Test', status: 'passed', duration: 500 },
      ];

      const metrics = TestMetricsCollector.collectTestMetrics(testResults);

      expect(metrics.performance.averageTestTime).toBeCloseTo(233.33, 1);
      expect(metrics.performance.slowestTests[0].name).toBe('Slow Test');
      expect(metrics.performance.fastestTests[0].name).toBe('Fast Test');
    });

    test('should calculate quality metrics', () => {
      const testResults = [
        { name: 'Test 1', status: 'passed', duration: 100, flaky: false },
        { name: 'Test 2', status: 'passed', duration: 200, flaky: true },
        { name: 'Test 3', status: 'failed', duration: 150, flaky: false },
      ];

      const metrics = TestMetricsCollector.collectTestMetrics(testResults);

      expect(metrics.quality.flakiness).toBeCloseTo(33.33, 1);
      expect(metrics.quality.reliability).toBeLessThan(100);
      expect(metrics.quality.maintainability).toBe('Good');
    });

    test('should handle empty test results', () => {
      const metrics = TestMetricsCollector.collectTestMetrics([]);

      expect(metrics.summary.total).toBe(0);
      expect(metrics.summary.passRate).toBe(0);
      expect(metrics.performance.slowestTests).toHaveLength(0);
      expect(metrics.performance.fastestTests).toHaveLength(0);
    });
  });

  describe('Quality Gates Assessment', () => {
    test('should assess quality gates correctly', () => {
      const metrics = {
        summary: { passRate: 98 },
        coverage: { lines: 85, branches: 78 },
        performance: { averageTestTime: 200 },
        quality: { reliability: 95, flakiness: 2 },
      };

      const assessment = TestMetricsCollector.assessQualityGates(metrics);

      expect(assessment.overallStatus).toBe('pass');
      expect(assessment.gates).toHaveLength(6);

      const passRateGate = assessment.gates.find(g => g.name === 'Pass Rate');
      expect(passRateGate?.status).toBe('pass');
    });

    test('should detect quality gate failures', () => {
      const metrics = {
        summary: { passRate: 80 }, // Below 95% threshold
        coverage: { lines: 70, branches: 60 }, // Below thresholds
        performance: { averageTestTime: 1500 }, // Above 1000ms threshold
        quality: { reliability: 85, flakiness: 8 }, // Below/above thresholds
      };

      const assessment = TestMetricsCollector.assessQualityGates(metrics);

      expect(assessment.overallStatus).toBe('fail');

      const failedGates = assessment.gates.filter(g => g.status === 'fail');
      expect(failedGates.length).toBeGreaterThan(0);
    });
  });

  describe('Health Score Calculation', () => {
    test('should calculate health score correctly', () => {
      const metrics = {
        summary: { passRate: 95 },
        coverage: { lines: 85 },
        performance: { averageTestTime: 500 },
        quality: { reliability: 90, maintainability: 'Good' },
      };

      const healthScore = TestMetricsCollector.calculateHealthScore(metrics);

      expect(healthScore.score).toBeGreaterThan(70);
      expect(healthScore.grade).toMatch(/^[A-F][+]?$/);
      expect(healthScore.factors).toHaveLength(5);

      healthScore.factors.forEach(factor => {
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
        expect(factor.weight).toBeGreaterThan(0);
      });
    });

    test('should assign appropriate grades', () => {
      const excellentMetrics = {
        summary: { passRate: 100 },
        coverage: { lines: 95 },
        performance: { averageTestTime: 100 },
        quality: { reliability: 100, maintainability: 'Good' },
      };

      const poorMetrics = {
        summary: { passRate: 60 },
        coverage: { lines: 50 },
        performance: { averageTestTime: 2000 },
        quality: { reliability: 50, maintainability: 'Poor' },
      };

      const excellentScore =
        TestMetricsCollector.calculateHealthScore(excellentMetrics);
      const poorScore = TestMetricsCollector.calculateHealthScore(poorMetrics);

      expect(['A+', 'A'].includes(excellentScore.grade)).toBe(true);
      expect(['D', 'F'].includes(poorScore.grade)).toBe(true);
    });
  });

  describe('Trend Analysis', () => {
    test('should generate trend analysis from historical data', () => {
      const historicalData = [
        { passRate: 90, coverage: 80, avgTestTime: 600 },
        { passRate: 92, coverage: 82, avgTestTime: 580 },
        { passRate: 94, coverage: 84, avgTestTime: 560 },
        { passRate: 96, coverage: 86, avgTestTime: 540 },
        { passRate: 98, coverage: 88, avgTestTime: 520 },
      ];

      const trends = TestMetricsCollector.generateTrendAnalysis(historicalData);

      expect(trends.trends.passRate).toBe('improving');
      expect(trends.trends.coverage).toBe('improving');
      expect(trends.trends.performance).toBe('improving');
      expect(trends.predictions.nextWeekPassRate).toBeGreaterThan(98);
    });

    test('should detect declining trends', () => {
      const historicalData = [
        { passRate: 98, coverage: 90, avgTestTime: 300 },
        { passRate: 95, coverage: 87, avgTestTime: 350 },
        { passRate: 92, coverage: 84, avgTestTime: 400 },
        { passRate: 89, coverage: 81, avgTestTime: 450 },
        { passRate: 86, coverage: 78, avgTestTime: 500 },
      ];

      const trends = TestMetricsCollector.generateTrendAnalysis(historicalData);

      expect(trends.trends.passRate).toBe('declining');
      expect(trends.trends.coverage).toBe('declining');
      expect(trends.trends.performance).toBe('declining');
    });

    test('should handle insufficient historical data', () => {
      const trends = TestMetricsCollector.generateTrendAnalysis([]);

      expect(trends.trends.passRate).toBe('stable');
      expect(trends.trends.coverage).toBe('stable');
      expect(trends.trends.performance).toBe('stable');
    });
  });

  describe('Export Functionality', () => {
    test('should export results in JSON format', () => {
      const metrics = { summary: { total: 10, passed: 8 } };
      const exported = TestMetricsCollector.exportResults(metrics, 'json');

      expect(exported.format).toBe('json');
      expect(exported.filename).toMatch(/test-results-\d+\.json/);
      expect(() => JSON.parse(exported.content)).not.toThrow();
    });

    test('should export results in XML format', () => {
      const metrics = {
        summary: { total: 10, passed: 8, failed: 2, passRate: 80 },
        coverage: { lines: 85, branches: 78, functions: 90 },
      };
      const exported = TestMetricsCollector.exportResults(metrics, 'xml');

      expect(exported.format).toBe('xml');
      expect(exported.filename).toMatch(/test-results-\d+\.xml/);
      expect(exported.content).toContain(
        '<?xml version="1.0" encoding="UTF-8"?>'
      );
      expect(exported.content).toContain('<testResults>');
    });

    test('should export results in HTML format', () => {
      const metrics = {
        summary: { passRate: 95, total: 20 },
        coverage: { lines: 85 },
      };
      const exported = TestMetricsCollector.exportResults(metrics, 'html');

      expect(exported.format).toBe('html');
      expect(exported.filename).toMatch(/test-results-\d+\.html/);
      expect(exported.content).toContain('<!DOCTYPE html>');
      expect(exported.content).toContain('<title>Test Results Report</title>');
    });

    test('should export results in CSV format', () => {
      const metrics = {
        summary: { passRate: 90, total: 15 },
        coverage: { lines: 82, branches: 75 },
        performance: { averageTestTime: 250 },
      };
      const exported = TestMetricsCollector.exportResults(metrics, 'csv');

      expect(exported.format).toBe('csv');
      expect(exported.filename).toMatch(/test-results-\d+\.csv/);
      expect(exported.content).toContain('Metric,Value');
      expect(exported.content).toContain('Pass Rate,90%');
    });

    test('should throw error for unsupported formats', () => {
      const metrics = { summary: { total: 5 } };

      expect(() => {
        TestMetricsCollector.exportResults(metrics, 'pdf' as any);
      }).toThrow('Unsupported format: pdf');
    });
  });

  describe('Test Results Dashboard Component', () => {
    test('should display empty state when no test results', () => {
      render(<TestResultsDashboard />);

      expect(screen.getByTestId('test-dashboard-empty')).toBeInTheDocument();
      expect(
        screen.getByText('No test results available. Run tests to see metrics.')
      ).toBeInTheDocument();
    });

    test('should display dashboard with test results', () => {
      const testResults = generateMockTestData(20, 0.9);

      render(<TestResultsDashboard testResults={testResults} />);

      expect(screen.getByTestId('test-results-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      expect(screen.getByTestId('health-score')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-tabs')).toBeInTheDocument();
    });

    test('should switch between different views', async () => {
      const user = userEvent.setup();
      const testResults = generateMockTestData(15, 0.85);

      render(<TestResultsDashboard testResults={testResults} />);

      // Default should be summary view
      expect(screen.getByTestId('summary-view')).toBeInTheDocument();

      // Switch to coverage view
      await user.click(screen.getByTestId('tab-coverage'));
      expect(screen.getByTestId('coverage-view')).toBeInTheDocument();
      expect(screen.queryByTestId('summary-view')).not.toBeInTheDocument();

      // Switch to performance view
      await user.click(screen.getByTestId('tab-performance'));
      expect(screen.getByTestId('performance-view')).toBeInTheDocument();

      // Switch to quality view
      await user.click(screen.getByTestId('tab-quality'));
      expect(screen.getByTestId('quality-view')).toBeInTheDocument();
    });

    test('should display quality gates in summary view', () => {
      const testResults = generateMockTestData(25, 0.92);

      render(<TestResultsDashboard testResults={testResults} />);

      expect(screen.getByTestId('quality-gates')).toBeInTheDocument();
      expect(screen.getByTestId('overall-status')).toBeInTheDocument();

      // Should have multiple quality gate items
      const qualityGateElements = screen.getAllByTestId(/quality-gate-\d+/);
      expect(qualityGateElements.length).toBeGreaterThan(0);
    });

    test('should display coverage metrics correctly', async () => {
      const user = userEvent.setup();
      const testResults = generateMockTestData(30, 0.88);

      render(<TestResultsDashboard testResults={testResults} />);

      await user.click(screen.getByTestId('tab-coverage'));

      expect(screen.getByTestId('coverage-view')).toBeInTheDocument();
      expect(screen.getByTestId('coverage-lines')).toBeInTheDocument();
      expect(screen.getByTestId('coverage-branches')).toBeInTheDocument();
      expect(screen.getByTestId('coverage-functions')).toBeInTheDocument();
      expect(screen.getByTestId('coverage-statements')).toBeInTheDocument();
    });

    test('should show performance metrics', async () => {
      const user = userEvent.setup();
      const testResults = generateMockTestData(20, 0.95);

      render(<TestResultsDashboard testResults={testResults} />);

      await user.click(screen.getByTestId('tab-performance'));

      expect(screen.getByTestId('performance-view')).toBeInTheDocument();
      expect(screen.getByTestId('slowest-tests')).toBeInTheDocument();
      expect(screen.getByTestId('fastest-tests')).toBeInTheDocument();
    });

    test('should handle export functionality', async () => {
      const user = userEvent.setup();
      const testResults = generateMockTestData(10, 0.9);

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(<TestResultsDashboard testResults={testResults} />);

      // Change export format
      await user.selectOptions(screen.getByTestId('export-format'), 'xml');

      // Click export button
      await user.click(screen.getByTestId('export-button'));

      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Test Trends Chart Component', () => {
    test('should display trend analysis', () => {
      const historicalData = [
        { passRate: 85, coverage: 80, avgTestTime: 400 },
        { passRate: 88, coverage: 82, avgTestTime: 380 },
        { passRate: 91, coverage: 84, avgTestTime: 360 },
      ];

      render(<TestTrendsChart historicalData={historicalData} />);

      expect(screen.getByTestId('test-trends-chart')).toBeInTheDocument();
      expect(screen.getByTestId('trends-summary')).toBeInTheDocument();
      expect(screen.getByTestId('predictions')).toBeInTheDocument();
      expect(screen.getByTestId('historical-data')).toBeInTheDocument();
    });

    test('should show trend indicators', () => {
      const improvingData = [
        { passRate: 80, coverage: 75, avgTestTime: 500 },
        { passRate: 85, coverage: 80, avgTestTime: 450 },
        { passRate: 90, coverage: 85, avgTestTime: 400 },
      ];

      render(<TestTrendsChart historicalData={improvingData} />);

      expect(screen.getByTestId('trend-pass-rate')).toHaveTextContent(
        'IMPROVING'
      );
      expect(screen.getByTestId('trend-coverage')).toHaveTextContent(
        'IMPROVING'
      );
      expect(screen.getByTestId('trend-performance')).toHaveTextContent(
        'IMPROVING'
      );
    });

    test('should display historical data entries', () => {
      const historicalData = [
        { passRate: 90, coverage: 85, avgTestTime: 300 },
        { passRate: 92, coverage: 87, avgTestTime: 290 },
      ];

      render(<TestTrendsChart historicalData={historicalData} />);

      expect(screen.getByTestId('historical-0')).toBeInTheDocument();
      expect(screen.getByTestId('historical-1')).toBeInTheDocument();

      expect(screen.getByText('Pass: 90%, Coverage: 85%')).toBeInTheDocument();
      expect(screen.getByText('Pass: 92%, Coverage: 87%')).toBeInTheDocument();
    });
  });

  describe('Mock Data Generation', () => {
    test('should generate mock test data with specified count', () => {
      const testData = generateMockTestData(50, 0.8);

      expect(testData).toHaveLength(50);

      testData.forEach(test => {
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('status');
        expect(test).toHaveProperty('duration');
        expect(['passed', 'failed', 'skipped']).toContain(test.status);
        expect(test.duration).toBeGreaterThanOrEqual(50);
      });
    });

    test('should respect pass rate parameter', () => {
      const testData = generateMockTestData(100, 1.0); // 100% pass rate
      const passedTests = testData.filter(t => t.status === 'passed').length;

      expect(passedTests).toBe(100);
    });

    test('should include flaky test indicators', () => {
      const testData = generateMockTestData(100, 0.9);
      const flakyTests = testData.filter(t => t.flaky).length;

      // Should have some flaky tests (around 10%)
      expect(flakyTests).toBeGreaterThan(0);
      expect(flakyTests).toBeLessThan(20);
    });
  });
});
