export interface ServerRackSpec {
  id: string;
  label: string;
  cpu: string;
  ram: string;
}

export interface ScalingSceneData {
  title: string;
  intro: {
    title: string;
    subtitle: string;
  };
  vertical: {
    title: string;
    subtitle: string;
    label: string;
    points: string[];
    initialSpec: { cpu: string; ram: string };
    finalSpec: { cpu: string; ram: string };
  };
  horizontal: {
    title: string;
    subtitle: string;
    label: string;
    points: string[];
    loadBalancerLabel: string;
    serverLabels: string[];
  };
  comparison: {
    title: string;
    vertical: {
      title: string;
      pros: string[];
      cons: string[];
    };
    horizontal: {
      title: string;
      pros: string[];
      cons: string[];
    };
  };
  takeaway: {
    title: string;
    verticalTerm: string;
    horizontalTerm: string;
    summary: string;
  };
}

export const scalingScene: ScalingSceneData = {
  title: "Vertical vs Horizontal Scaling",
  intro: {
    title: "Vertical vs Horizontal Scaling",
    subtitle: "System Design Core Concepts"
  },
  vertical: {
    title: "Vertical Scaling",
    subtitle: "Scale Up",
    label: "Scale Up",
    points: [
      "Increase server CPU power",
      "Increase server RAM capacity",
      "All hosted on a single server instance"
    ],
    initialSpec: { cpu: "4 Cores", ram: "16 GB" },
    finalSpec: { cpu: "32 Cores", ram: "128 GB" }
  },
  horizontal: {
    title: "Horizontal Scaling",
    subtitle: "Scale Out",
    label: "Scale Out",
    points: [
      "Add more servers to the pool",
      "Distribute traffic via a load balancer",
      "Scale out to handle massive demand"
    ],
    loadBalancerLabel: "Load Balancer",
    serverLabels: ["Server 1", "Server 2", "Server 3", "Server 4"]
  },
  comparison: {
    title: "Vertical vs Horizontal",
    vertical: {
      title: "Vertical Scaling (Scale Up)",
      pros: [
        "Simple to deploy & configure",
        "No distributed complexity",
        "Low initial overhead"
      ],
      cons: [
        "Strict physical hardware limits",
        "Single point of failure"
      ]
    },
    horizontal: {
      title: "Horizontal Scaling (Scale Out)",
      pros: [
        "Near-infinite elastic growth",
        "Highly fault tolerant & resilient"
      ],
      cons: [
        "High operational complexity",
        "Requires distributed coordination"
      ]
    }
  },
  takeaway: {
    title: "Final Takeaway",
    verticalTerm: "Vertical Scaling = Scale Up",
    horizontalTerm: "Horizontal Scaling = Scale Out",
    summary: "Modern cloud systems typically favor horizontal scaling."
  }
};
