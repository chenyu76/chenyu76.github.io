# A Preview of Some Interesting Optimization Algorithms

Trust region, gradient descent, stochastic gradient descent, direct search and blockwise direct search

## Trust Region

[Trust-region](https://en.wikipedia.org/wiki/Trust_region) methods are a family of methods. Their core idea is to maintain, around the current point, a region where a model is considered “trustworthy,” and to constrain candidate steps to remain within that region. Different trust-region algorithms may use different types of models and solution methods. In general, the algorithm compares the improvement predicted by the model with the actual improvement in the objective function, then accepts or rejects the candidate step and adjusts the size of the trust region accordingly. This animation shows one implementation that uses a local quadratic model based on the gradient.

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/trust-region.html"
            loading="lazy"
            title="Trust Region algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Trust Region</div>
  </div>
</div>

## Gradient Descent (GD)

[Gradient descent](https://en.wikipedia.org/wiki/Gradient_descent) computes the gradient of the entire objective function at each step and moves in the direction of the negative gradient.

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/gradient-descent.html"
            loading="lazy"
            title="Gradient Descent algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Gradient Descent</div>
  </div>
</div>

## Stochastic Gradient Descent (SGD)

[Stochastic gradient descent](https://en.wikipedia.org/wiki/Stochastic_gradient_descent) can be viewed as a stochastic approximation of gradient descent: at each step, it randomly selects only one sample or one mini-batch. This sacrifices some accuracy in the direction of each individual step and may slow convergence, but significantly reduces the computational cost of each iteration, making it particularly suitable for high-dimensional, large-scale data problems.

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/stochastic-gradient-descent.html"
            loading="lazy"
            title="Stochastic Gradient Descent algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Stochastic Gradient Descent</div>
  </div>
</div>

## Direct Search (DS)

[Direct search](https://en.wikipedia.org/wiki/Pattern_search_%28optimization%29) does not use gradients. In each round, it probes the objective function from the current point along several predefined directions; this example uses the four coordinate directions—up, down, left, and right—and moves to the one producing the best improvement. When an improvement is found, it increases the shared step size; when none is found, it decreases the step size. As a result, it moves quickly through open regions and gradually becomes more cautious near the bottom of a valley.

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/direct-search.html"
            loading="lazy"
            title="Direct Search algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Direct Search</div>
  </div>
</div>

## Blockwise Direct Search (BDS)

[BDS](https://github.com/blockwise-direct-search/bds) divides the variables into several blocks and searches them separately, making it a blockwise variant of direct search. In this example, the two coordinate axes are treated as two blocks. The algorithm alternately probes the positive and negative directions along one coordinate axis, maintaining an independent step size for each direction. When a direction produces an improvement, only its own step size is increased; when it fails, only its own step size is decreased. Thus, when the objective function has very different scales along different directions, the algorithm can adapt to them independently instead of forcing all directions to share a single step size.

<div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; width: 100%; flex-wrap: nowrap;">
  <div style="flex: 0 0 70%; text-align: center;">
    <iframe src="assets/animations/solver-preview/bds.html"
            loading="lazy"
            title="Blockwise Direct Search algorithm demo"
            style="width:100%; aspect-ratio:1/1; border:1px solid #d4dae2; border-radius:12px; background:#fff;"></iframe>
    <div>Blockwise Direct Search</div>
  </div>
</div>
