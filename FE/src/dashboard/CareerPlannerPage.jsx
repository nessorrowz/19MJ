import CandidateSidebar from "./CandidateSidebar";

export default function CareerPlannerPage() {
  return (
    <div style={styles.container}>
      
      <CandidateSidebar active="career" />

      <div style={styles.content}>
        <h1>Career Planner</h1>
        <p>Coming soon...</p>
      </div>

    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fa"
  },

  content: {
    flex: 1,
    padding: "40px"
  }
};